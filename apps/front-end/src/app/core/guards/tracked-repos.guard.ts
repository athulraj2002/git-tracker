import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ReposService } from '../repos.service';

export const hasTrackedReposGuard: CanActivateFn = async () => {
  const reposService = inject(ReposService);
  const router = inject(Router);
  try {
    const repos = await reposService.getTrackedRepos();
    return repos.length > 0 ? true : router.parseUrl('/select-repos');
  } catch {
    return router.parseUrl('/login');
  }
};
