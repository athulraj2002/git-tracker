import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, type CanActivateFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { TrackedRepo } from '@org/types';

export const hasTrackedReposGuard: CanActivateFn = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);
  try {
    const repos = await firstValueFrom(
      http.get<TrackedRepo[]>('/api/repos/tracked'),
    );
    return repos.length > 0 ? true : router.parseUrl('/select-repos');
  } catch {
    return router.parseUrl('/login');
  }
};
