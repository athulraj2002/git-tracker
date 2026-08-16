import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  GithubRepo,
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
    const row = await this.db.query.trackedRepos.findFirst({
      where: and(eq(trackedRepos.id, repoId), eq(trackedRepos.userId, userId)),
    });
    if (!row) {
      throw new NotFoundException('Tracked repository not found.');
    }

    const identity = await this.getGithubIdentity(userId);
    const commits = await this.githubReposService.getCommits(
      identity.accessToken as string,
      row.fullName,
    );

    return { repo: toTrackedRepo(row), commits };
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
