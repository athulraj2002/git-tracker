import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { hasTrackedReposGuard } from './core/guards/tracked-repos.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  { path: 'signup', redirectTo: 'login' },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback').then(
        (m) => m.AuthCallback,
      ),
  },
  {
    path: 'select-repos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/select-repos/select-repos').then((m) => m.SelectRepos),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, hasTrackedReposGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
];
