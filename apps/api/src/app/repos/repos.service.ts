import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { GithubRepo, SelectedRepo, TrackedRepo } from '@org/types';

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

    return this.githubReposService.listRepos(identity.accessToken);
  }

  async getTrackedRepos(userId: string): Promise<TrackedRepo[]> {
    const rows = await this.db.query.trackedRepos.findMany({
      where: eq(trackedRepos.userId, userId),
    });
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      providerRepoId: row.providerRepoId,
      fullName: row.fullName,
      private: row.private,
      htmlUrl: row.htmlUrl,
      createdAt: row.createdAt.toISOString(),
    }));
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
        })),
      )
      .returning();

    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      providerRepoId: row.providerRepoId,
      fullName: row.fullName,
      private: row.private,
      htmlUrl: row.htmlUrl,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
