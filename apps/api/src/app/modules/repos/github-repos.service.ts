import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GithubRepoSchema, RepoCommitSchema } from '@org/zod-schemas';
import type { GithubRepo, RepoCommit } from '@org/types';

const GITHUB_REPOS_URL =
  'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member';

@Injectable()
export class GithubReposService {
  async listRepos(accessToken: string): Promise<GithubRepo[]> {
    const response = await fetch(GITHUB_REPOS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch your GitHub repositories.');
    }

    const body = await response.json();
    return (body as unknown[]).map((repo) => {
      const r = repo as Record<string, unknown>;
      return GithubRepoSchema.parse({
        id: r['id'],
        name: r['name'],
        fullName: r['full_name'],
        private: r['private'],
        defaultBranch: r['default_branch'],
        language: r['language'],
        description: r['description'],
        htmlUrl: r['html_url'],
        cloneUrl: r['clone_url'],
        stars: r['stargazers_count'],
        forks: r['forks_count'],
        openIssues: r['open_issues_count'],
        createdAt: r['created_at'],
        updatedAt: r['updated_at'],
      });
    });
  }

  /**
   * GitHub returns the newest `perPage` commits matching `since`, not a
   * sample spread across the whole window - for an active repo, the newest
   * 100 commits can easily all fall within a few days, so widening `since`
   * further back returns the exact same page. `maxPages` lets a caller that
   * wants real date-range filtering (repo-detail) page further back; callers
   * that don't (the dashboard's per-repo aggregation) can leave it at the
   * default of 1 page to avoid the added GitHub API calls per tracked repo.
   */
  async getCommits(
    accessToken: string,
    fullName: string,
    options?: { since?: string; until?: string; perPage?: number; maxPages?: number },
  ): Promise<RepoCommit[]> {
    const perPage = options?.perPage ?? 10;
    const maxPages = options?.maxPages ?? 1;
    const commits: RepoCommit[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
      });
      if (options?.since) {
        params.set('since', options.since);
      }
      if (options?.until) {
        // A plain date is midnight UTC, which would exclude same-day commits
        // made after that instant - push it to the end of that day instead,
        // so the end date is inclusive the way a human picking it would expect.
        params.set('until', `${options.until}T23:59:59Z`);
      }

      const response = await fetch(
        `https://api.github.com/repos/${fullName}/commits?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      if (!response.ok) {
        throw new UnauthorizedException(
          'Unable to fetch commits for this repository.',
        );
      }

      const body = (await response.json()) as unknown[];
      commits.push(
        ...body.map((commit) => {
          const c = commit as Record<string, unknown>;
          const commitInfo = c['commit'] as Record<string, unknown>;
          const author = commitInfo['author'] as Record<string, unknown>;
          const authorAccount = c['author'] as Record<string, unknown> | null;
          return RepoCommitSchema.parse({
            sha: c['sha'],
            message: (commitInfo['message'] as string).split('\n')[0],
            authorLogin: authorAccount?.['login'] ?? null,
            authorAvatarUrl: authorAccount?.['avatar_url'] ?? null,
            committedAt: author['date'],
            htmlUrl: c['html_url'],
          });
        }),
      );

      if (body.length < perPage) break;
    }

    return commits;
  }
}
