import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getAvailableRepos(): Promise<GithubRepo[]> {
    return firstValueFrom(this.http.get<GithubRepo[]>('/api/repos/available'));
  }

  getTrackedRepos(): Promise<TrackedRepo[]> {
    return firstValueFrom(this.http.get<TrackedRepo[]>('/api/repos/tracked'));
  }

  getRepoDetail(id: string): Promise<RepoDetailResponse> {
    return firstValueFrom(
      this.http.get<RepoDetailResponse>(`/api/repos/tracked/${id}`),
    );
  }

  setTrackedRepos(repos: SelectedRepo[]): Promise<TrackedRepo[]> {
    return firstValueFrom(
      this.http.put<TrackedRepo[]>('/api/repos/tracked', { repos }),
    );
  }
}
