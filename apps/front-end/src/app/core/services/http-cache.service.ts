import { Service } from '@angular/core';
import type { HttpResponse } from '@angular/common/http';
import { COMMIT_CACHE_TTL_MS } from '@org/helpers';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

// Matches the backend's own commit-cache TTL (ReposService.syncCommitsIfStale)
// rather than a separately-tuned number - the backend won't return anything
// new within that window anyway, so re-fetching sooner than that from here
// would just be an extra round trip for the same response.
const TTL_MS = COMMIT_CACHE_TTL_MS;

@Service()
export class HttpCacheService {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): HttpResponse<unknown> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.response;
  }

  set(key: string, response: HttpResponse<unknown>): void {
    this.store.set(key, { response, expiresAt: Date.now() + TTL_MS });
  }

  clear(): void {
    this.store.clear();
  }
}
