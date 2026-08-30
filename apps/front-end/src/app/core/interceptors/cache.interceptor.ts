import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { HttpCacheService } from '../services/http-cache.service';

/**
 * Caches GET responses for a short TTL (see HttpCacheService) so navigating
 * between sidenav pages that independently request the same data (e.g.
 * Dashboard, Repos, and Settings all fetch tracked repos) doesn't re-hit the
 * network every time the router recreates the page component.
 *
 * Any non-GET request clears the whole cache rather than trying to
 * invalidate specific keys - this app only has one mutation endpoint
 * (PUT /repos/tracked), so a blanket clear is simple and can't miss a stale
 * entry a more targeted invalidation might.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCacheService);

  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.clear();
        }
      }),
    );
  }

  const cached = cache.get(req.urlWithParams);
  if (cached) {
    return of(cached.clone());
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.urlWithParams, event.clone());
      }
    }),
  );
};
