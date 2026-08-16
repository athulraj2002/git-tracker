import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GithubRepoSchema } from '@org/zod-schemas';
import type { GithubRepo } from '@org/types';

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
        createdAt: r['created_at'],
        updatedAt: r['updated_at'],
      });
    });
  }
}
