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

  async getCommits(
    accessToken: string,
    fullName: string,
  ): Promise<RepoCommit[]> {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/commits?per_page=10`,
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

    const body = await response.json();
    return (body as unknown[]).map((commit) => {
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
    });
  }
}
