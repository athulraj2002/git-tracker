import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  sql,
} from 'drizzle-orm';
import type {
  AvailableRepo,
  RepoCommit,
  RepoCommitWithContext,
  RepoDetailResponse,
  SelectedRepo,
  TrackedRepo,
} from '@org/types';

import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import {
  repoCommits,
  trackedRepos,
  userIdentities,
  type RepoCommitRow,
} from '../database/schema';
import { GithubReposService } from './github-repos.service';

// How long a repo's cached commits are trusted before a request triggers a
// re-sync from GitHub. Short enough that new commits show up promptly,
// long enough that repeat requests within a browsing session (switching
// date filters, revisiting a page) don't re-hit GitHub at all.
const COMMIT_SYNC_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class ReposService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly githubReposService: GithubReposService,
  ) {}

  /**
   * Upserts the user's live GitHub repo listing into the repos table -
   * metadata for every repo the token can see is persisted here, tracked or
   * not, so a later tracked/detail view doesn't need to re-fetch it. This
   * must never touch `trackedAt`: it's a metadata sync, not a tracking
   * action, so that column is simply omitted from both the insert values
   * (new row -> defaults to untracked) and the conflict update (existing
   * row -> its current tracked state is left exactly as it was).
   */
  async getAvailableRepos(userId: string): Promise<AvailableRepo[]> {
    const identity = await this.getGithubIdentity(userId);
    const githubRepos = await this.githubReposService.listRepos(
      identity.accessToken as string,
    );
    if (githubRepos.length === 0) {
      return [];
    }

    const rows = await this.db
      .insert(trackedRepos)
      .values(
        githubRepos.map((repo) => ({
          userId,
          provider: 'github' as const,
          providerRepoId: String(repo.id),
          fullName: repo.fullName,
          private: repo.private,
          htmlUrl: repo.htmlUrl,
          description: repo.description,
          language: repo.language,
          defaultBranch: repo.defaultBranch,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
        })),
      )
      .onConflictDoUpdate({
        target: [
          trackedRepos.userId,
          trackedRepos.provider,
          trackedRepos.providerRepoId,
        ],
        set: {
          fullName: sql`excluded.full_name`,
          private: sql`excluded.private`,
          htmlUrl: sql`excluded.html_url`,
          description: sql`excluded.description`,
          language: sql`excluded.language`,
          defaultBranch: sql`excluded.default_branch`,
          stars: sql`excluded.stars`,
          forks: sql`excluded.forks`,
          openIssues: sql`excluded.open_issues`,
          syncedAt: sql`now()`,
        },
      })
      .returning();

    const rowByProviderId = new Map(rows.map((row) => [row.providerRepoId, row]));

    return githubRepos.map((repo) => {
      // Every repo just upserted above has a row here - the map lookup can
      // only miss if GitHub returned a repo id absent from what we just sent.
      const row = rowByProviderId.get(String(repo.id));
      return {
        ...repo,
        repoId: row?.id ?? '',
        trackedId: row?.trackedAt ? row.id : null,
      };
    });
  }

  async getTrackedRepos(userId: string): Promise<TrackedRepo[]> {
    const rows = await this.db.query.trackedRepos.findMany({
      where: and(
        eq(trackedRepos.userId, userId),
        isNotNull(trackedRepos.trackedAt),
      ),
    });
    return rows.map(toTrackedRepo);
  }

  /**
   * The repo-detail page fetches its own commits separately (see
   * getRepoCommits) and never reads this response's commit list, so this
   * only ever needs the repo metadata - no GitHub call, no cache sync.
   */
  async getRepoDetail(
    userId: string,
    repoId: string,
  ): Promise<RepoDetailResponse> {
    const row = await this.findTrackedRepoRow(userId, repoId);
    return { repo: toTrackedRepo(row) };
  }

  /**
   * Separate from getRepoDetail so that changing the repo-detail page's date
   * filter only re-triggers this request, not the repo metadata one - the
   * two used to be fetched together, which meant the whole page (including
   * the repo header) flashed back to a loading state on every filter change.
   */
  async getRepoCommits(
    userId: string,
    repoId: string,
    since?: string,
    until?: string,
  ): Promise<RepoCommit[]> {
    const row = await this.findTrackedRepoRow(userId, repoId);
    const identity = await this.getGithubIdentity(userId);
    await this.syncCommitsIfStale(row, identity.accessToken as string);

    const conditions = [eq(repoCommits.repoId, row.id)];
    if (since) conditions.push(gte(repoCommits.committedAt, new Date(since)));
    if (until) conditions.push(lte(repoCommits.committedAt, endOfDayUtc(until)));

    // limit: 300 to match the old GitHub-direct cap (maxPages: 3 x
    // perPage: 100), so a wide date-range selection doesn't return an
    // unbounded result for a very active repo.
    const rows = await this.db.query.repoCommits.findMany({
      where: and(...conditions),
      orderBy: [desc(repoCommits.committedAt)],
      limit: 300,
    });
    return rows.map(toRepoCommit);
  }

  async getContributionActivity(
    userId: string,
    since?: string,
    until?: string,
  ): Promise<RepoCommitWithContext[]> {
    const rows = await this.db.query.trackedRepos.findMany({
      where: and(
        eq(trackedRepos.userId, userId),
        isNotNull(trackedRepos.trackedAt),
      ),
    });
    if (rows.length === 0) {
      return [];
    }

    const identity = await this.getGithubIdentity(userId);
    const accessToken = identity.accessToken as string;

    await Promise.all(
      rows.map(async (row) => {
        try {
          await this.syncCommitsIfStale(row, accessToken);
        } catch {
          // A single inaccessible/renamed/empty repo shouldn't fail the whole dashboard.
        }
      }),
    );

    const conditions = [
      inArray(
        repoCommits.repoId,
        rows.map((row) => row.id),
      ),
    ];
    if (since) conditions.push(gte(repoCommits.committedAt, new Date(since)));
    if (until) conditions.push(lte(repoCommits.committedAt, endOfDayUtc(until)));

    const commitRows = await this.db.query.repoCommits.findMany({
      where: and(...conditions),
      orderBy: [desc(repoCommits.committedAt)],
    });

    const fullNameByRepoId = new Map(rows.map((row) => [row.id, row.fullName]));
    return commitRows
      .map((row) => ({
        ...toRepoCommit(row),
        repoId: row.repoId,
        repoFullName: fullNameByRepoId.get(row.repoId) ?? '',
      }))
      .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
  }

  /**
   * Refreshes the commit cache for one repo, but only if it's stale (never
   * synced, or older than COMMIT_SYNC_TTL_MS) - repeat calls within the TTL
   * window are a no-op, so switching date filters or revisiting a page
   * doesn't re-hit GitHub. A never-synced repo gets a fuller backfill (most
   * recent 300 commits); an already-synced repo only fetches what's new
   * since last time, since everything older is already cached.
   */
  private async syncCommitsIfStale(
    row: typeof trackedRepos.$inferSelect,
    accessToken: string,
  ): Promise<void> {
    const isStale =
      !row.commitsSyncedAt ||
      Date.now() - row.commitsSyncedAt.getTime() > COMMIT_SYNC_TTL_MS;
    if (!isStale) return;

    const fetched = await this.githubReposService.getCommits(
      accessToken,
      row.fullName,
      row.commitsSyncedAt
        ? { since: row.commitsSyncedAt.toISOString(), perPage: 100, maxPages: 3 }
        : { perPage: 100, maxPages: 3 },
    );

    if (fetched.length > 0) {
      await this.db
        .insert(repoCommits)
        .values(
          fetched.map((commit) => ({
            repoId: row.id,
            sha: commit.sha,
            message: commit.message,
            authorLogin: commit.authorLogin,
            authorAvatarUrl: commit.authorAvatarUrl,
            committedAt: new Date(commit.committedAt),
            htmlUrl: commit.htmlUrl,
          })),
        )
        // Commits are immutable once made - nothing to update on a repeat
        // sighting, just skip it.
        .onConflictDoNothing({ target: [repoCommits.repoId, repoCommits.sha] });
    }

    await this.db
      .update(trackedRepos)
      .set({ commitsSyncedAt: new Date() })
      .where(eq(trackedRepos.id, row.id));
  }

  /**
   * Marks a single already-synced repo (row created by getAvailableRepos) as
   * tracked. Idempotent: re-tracking an already-tracked repo just refreshes
   * trackedAt.
   */
  async trackRepo(userId: string, repoId: string): Promise<TrackedRepo> {
    const updated = await this.db
      .update(trackedRepos)
      .set({ trackedAt: new Date() })
      .where(and(eq(trackedRepos.id, repoId), eq(trackedRepos.userId, userId)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('Repository not found.');
    }
    return toTrackedRepo(updated[0]);
  }

  /**
   * Nulls trackedAt rather than deleting the row, so the cached metadata (and
   * eventually commit history) survives if the repo gets tracked again later.
   */
  async untrackRepo(userId: string, repoId: string): Promise<void> {
    const updated = await this.db
      .update(trackedRepos)
      .set({ trackedAt: null })
      .where(
        and(
          eq(trackedRepos.id, repoId),
          eq(trackedRepos.userId, userId),
          isNotNull(trackedRepos.trackedAt),
        ),
      )
      .returning({ id: trackedRepos.id });
    if (updated.length === 0) {
      throw new NotFoundException('Tracked repository not found.');
    }
  }

  /**
   * Replaces the full tracked set: upserts the desired repos with
   * trackedAt=now() (setting it on the conflict path too, since a repo may
   * already have a row from getAvailableRepos' metadata sync), and untracks
   * (nulls trackedAt on, rather than deletes) anything currently tracked
   * that isn't in the new desired set.
   */
  async setTrackedRepos(
    userId: string,
    repos: SelectedRepo[],
  ): Promise<TrackedRepo[]> {
    const desiredProviderIds = repos.map((repo) => String(repo.id));
    const stillTrackedCondition =
      desiredProviderIds.length > 0
        ? notInArray(trackedRepos.providerRepoId, desiredProviderIds)
        : undefined;

    await this.db
      .update(trackedRepos)
      .set({ trackedAt: null })
      .where(
        and(
          eq(trackedRepos.userId, userId),
          eq(trackedRepos.provider, 'github'),
          isNotNull(trackedRepos.trackedAt),
          stillTrackedCondition,
        ),
      );

    if (repos.length === 0) {
      return [];
    }

    const rows = await this.db
      .insert(trackedRepos)
      .values(
        repos.map((repo) => ({
          userId,
          provider: 'github' as const,
          providerRepoId: String(repo.id),
          fullName: repo.fullName,
          private: repo.private,
          htmlUrl: repo.htmlUrl,
          description: repo.description ?? null,
          language: repo.language ?? null,
          defaultBranch: repo.defaultBranch ?? null,
          stars: repo.stars ?? 0,
          forks: repo.forks ?? 0,
          openIssues: repo.openIssues ?? 0,
          trackedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [
          trackedRepos.userId,
          trackedRepos.provider,
          trackedRepos.providerRepoId,
        ],
        set: {
          fullName: sql`excluded.full_name`,
          private: sql`excluded.private`,
          htmlUrl: sql`excluded.html_url`,
          description: sql`excluded.description`,
          language: sql`excluded.language`,
          defaultBranch: sql`excluded.default_branch`,
          stars: sql`excluded.stars`,
          forks: sql`excluded.forks`,
          openIssues: sql`excluded.open_issues`,
          trackedAt: sql`excluded.tracked_at`,
          syncedAt: sql`now()`,
        },
      })
      .returning();

    return rows.map(toTrackedRepo);
  }

  private async findTrackedRepoRow(userId: string, repoId: string) {
    const row = await this.db.query.trackedRepos.findFirst({
      where: and(eq(trackedRepos.id, repoId), eq(trackedRepos.userId, userId)),
    });
    if (!row) {
      throw new NotFoundException('Tracked repository not found.');
    }
    return row;
  }

  private async getGithubIdentity(userId: string) {
    const identity = await this.db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, userId),
        eq(userIdentities.provider, 'github'),
      ),
    });
    if (!identity?.accessToken) {
      throw new BadRequestException(
        'Connect a GitHub account before selecting repositories.',
      );
    }
    return identity;
  }
}

function toTrackedRepo(row: typeof trackedRepos.$inferSelect): TrackedRepo {
  return {
    id: row.id,
    provider: row.provider,
    providerRepoId: row.providerRepoId,
    fullName: row.fullName,
    private: row.private,
    htmlUrl: row.htmlUrl,
    description: row.description,
    language: row.language,
    defaultBranch: row.defaultBranch,
    stars: row.stars,
    forks: row.forks,
    openIssues: row.openIssues,
    trackedAt: row.trackedAt ? row.trackedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRepoCommit(row: RepoCommitRow): RepoCommit {
  return {
    sha: row.sha,
    message: row.message,
    authorLogin: row.authorLogin,
    authorAvatarUrl: row.authorAvatarUrl,
    committedAt: row.committedAt.toISOString(),
    htmlUrl: row.htmlUrl,
  };
}

// A plain `until` date is midnight UTC, which would exclude same-day
// commits made after that instant - push it to the end of that day instead,
// matching the inclusive-end-date semantics GithubReposService.getCommits
// already applies when it calls GitHub directly.
function endOfDayUtc(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}
