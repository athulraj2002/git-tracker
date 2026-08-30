import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  GithubRepo,
  RepoCommit,
  RepoCommitWithContext,
  RepoDetailResponse,
  SelectedRepo,
  TrackedRepo,
} from '@org/types';

import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { trackedRepos, userIdentities } from '../database/schema';
import { GithubReposService } from './github-repos.service';

@Injectable()
export class ReposService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly githubReposService: GithubReposService,
  ) {}

  async getAvailableRepos(userId: string): Promise<GithubRepo[]> {
    const identity = await this.getGithubIdentity(userId);
    return this.githubReposService.listRepos(identity.accessToken as string);
  }

  async getTrackedRepos(userId: string): Promise<TrackedRepo[]> {
    const rows = await this.db.query.trackedRepos.findMany({
      where: eq(trackedRepos.userId, userId),
    });
    return rows.map(toTrackedRepo);
  }

  async getRepoDetail(
    userId: string,
    repoId: string,
  ): Promise<RepoDetailResponse> {
    const row = await this.findTrackedRepoRow(userId, repoId);
    const identity = await this.getGithubIdentity(userId);
    const commits = await this.githubReposService.getCommits(
      identity.accessToken as string,
      row.fullName,
    );

    return { repo: toTrackedRepo(row), commits };
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
  ): Promise<RepoCommit[]> {
    const row = await this.findTrackedRepoRow(userId, repoId);
    const identity = await this.getGithubIdentity(userId);
    // maxPages: 3 (up to 300 commits) so a wider date-range selection can
    // actually surface more history for an active repo - GitHub returns the
    // newest `perPage` commits matching `since`, so a single page can't tell
    // a 7-day window from a 365-day one once a repo has 100+ recent commits.
    return this.githubReposService.getCommits(
      identity.accessToken as string,
      row.fullName,
      { since, perPage: 100, maxPages: 3 },
    );
  }

  async getContributionActivity(
    userId: string,
    since?: string,
  ): Promise<RepoCommitWithContext[]> {
    const repos = await this.getTrackedRepos(userId);
    if (repos.length === 0) {
      return [];
    }

    const identity = await this.getGithubIdentity(userId);
    const accessToken = identity.accessToken as string;

    const perRepoCommits = await Promise.all(
      repos.map(async (repo) => {
        try {
          const commits = await this.githubReposService.getCommits(
            accessToken,
            repo.fullName,
            { since, perPage: 100 },
          );
          return commits.map((commit) => ({
            ...commit,
            repoId: repo.id,
            repoFullName: repo.fullName,
          }));
        } catch {
          // A single inaccessible/renamed/empty repo shouldn't fail the whole dashboard.
          return [];
        }
      }),
    );

    return perRepoCommits
      .flat()
      .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
  }

  async setTrackedRepos(
    userId: string,
    repos: SelectedRepo[],
  ): Promise<TrackedRepo[]> {
    await this.db
      .delete(trackedRepos)
      .where(
        and(eq(trackedRepos.userId, userId), eq(trackedRepos.provider, 'github')),
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
        })),
      )
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
    createdAt: row.createdAt.toISOString(),
  };
}
