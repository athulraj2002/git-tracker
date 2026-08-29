import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  GithubRepo,
  RepoDetailResponse,
  SelectedRepo,
  TrackedRepo,
} from '@org/types';

@Injectable({ providedIn: 'root' })
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

  setTrackedRepos(repos: SelectedRepo[]): Promise<TrackedRepo[]> {
    return firstValueFrom(
      this.http.put<TrackedRepo[]>('/api/repos/tracked', { repos }),
    );
  }
}
