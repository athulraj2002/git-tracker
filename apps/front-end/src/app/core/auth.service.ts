import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AuthUser, ConnectedIdentity } from '@org/types';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './auth.storage';

export type OAuthProvider = 'github' | 'gitlab' | 'bitbucket';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(this.readStoredUser());
  private readonly _accessToken = signal<string | null>(
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  async getOAuthAuthorizeUrl(provider: OAuthProvider): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<{ url: string }>(`/api/auth/${provider}`),
    );
    return response.url;
  }

  async completeOAuthLogin(accessToken: string): Promise<void> {
    this._accessToken.set(accessToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);

    const user = await firstValueFrom(this.http.get<AuthUser>('/api/auth/me'));
    this._user.set(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  identities() {
    return httpResource<ConnectedIdentity[]>(() => '/api/auth/identities', {
      defaultValue: [],
    });
  }

  logout(): void {
    this._user.set(null);
    this._accessToken.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.router.navigateByUrl('/login');
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
