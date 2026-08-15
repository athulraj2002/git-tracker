import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
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
];
