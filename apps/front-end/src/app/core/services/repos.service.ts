import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  GithubRepo,
  RepoCommit,
  RepoCommitWithContext,
  RepoDetailResponse,
  SelectedRepo,
  TrackedRepo,
} from '@org/types';

import { Service, inject } from '@angular/core';

@Service()
export class ReposService {
  private readonly http = inject(HttpClient);

  availableRepos() {
    return httpResource<GithubRepo[]>(() => '/api/repos/available', {
      defaultValue: [],
    });
  }

  trackedRepos() {
    return httpResource<TrackedRepo[]>(() => '/api/repos/tracked', {
      defaultValue: [],
    });
  }

  repoDetail(id: () => string | undefined) {
    return httpResource<RepoDetailResponse>(() => {
      const repoId = id();
      return repoId ? `/api/repos/tracked/${repoId}` : undefined;
    });
  }

  /**
   * Separate resource from repoDetail() so that changing the date filter
   * only re-triggers this request - if the two are combined into one
   * resource, every filter change re-enters "loading" for the whole thing,
   * including the repo metadata that didn't actually change.
   */
  repoCommits(id: () => string | undefined, since: () => string | undefined) {
    return httpResource<RepoCommit[]>(
      () => {
        const repoId = id();
        if (!repoId) return undefined;
        const sinceValue = since();
        const params: Record<string, string> = {};
        if (sinceValue) {
          params['since'] = sinceValue;
        }
        return { url: `/api/repos/tracked/${repoId}/commits`, params };
      },
      { defaultValue: [] },
    );
  }

  contributionActivity(since: () => string | undefined) {
    return httpResource<RepoCommitWithContext[]>(
      () => {
        const sinceValue = since();
        const params: Record<string, string> = {};
        if (sinceValue) {
          params['since'] = sinceValue;
        }
        return { url: '/api/repos/commits', params };
      },
      { defaultValue: [] },
    );
  }

  setTrackedRepos(repos: SelectedRepo[]): Promise<TrackedRepo[]> {
    return firstValueFrom(
      this.http.put<TrackedRepo[]>('/api/repos/tracked', { repos }),
    );
  }
}
