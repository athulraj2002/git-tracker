import { Service } from '@angular/core';
import type { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

const TTL_MS = 30_000;

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
