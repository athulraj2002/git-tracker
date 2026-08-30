import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  AvailableRepo,
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

  /**
   * Every repo the user's GitHub token can see, each enriched with
   * `trackedId` (the internal id if it's currently tracked, else null) -
   * the backend upserts this same live listing into its repos table, so
   * calling this also persists metadata for untracked repos instead of
   * only ever fetching it on demand.
   */
  availableRepos() {
    return httpResource<AvailableRepo[]>(() => '/api/repos/available', {
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

  trackRepo(id: string): Promise<TrackedRepo> {
    return firstValueFrom(this.http.put<TrackedRepo>(`/api/repos/tracked/${id}`, {}));
  }

  untrackRepo(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/repos/tracked/${id}`));
  }
}
