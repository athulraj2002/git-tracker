import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  SignupRequest,
} from '@org/types';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './auth.storage';

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

  async signup(payload: SignupRequest): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/signup', payload),
    );
    this.setSession(response);
  }

  async login(payload: LoginRequest): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/login', payload),
    );
    this.setSession(response);
  }

  logout(): void {
    this._user.set(null);
    this._accessToken.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.router.navigateByUrl('/login');
  }

  private setSession(response: AuthResponse): void {
    this._user.set(response.user);
    this._accessToken.set(response.accessToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
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
