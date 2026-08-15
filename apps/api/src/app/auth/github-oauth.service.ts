import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenSchema, GithubUserSchema } from '@org/zod-schemas';
import type { OAuthProfile } from './oauth-profile';
import { OAuthStateService } from './oauth-state.service';

const PROVIDER = 'github';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_USER_EMAILS_URL = 'https://api.github.com/user/emails';

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GithubOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oauthState: OAuthStateService,
  ) {}

  async buildAuthorizeUrl(): Promise<string> {
    const state = await this.oauthState.createState(PROVIDER);
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GITHUB_OAUTH_CALLBACK_URL'),
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  }

  verifyState(state: string): Promise<void> {
    return this.oauthState.verifyState(PROVIDER, state);
  }

  async fetchProfile(code: string): Promise<OAuthProfile> {
    const accessToken = await this.exchangeCodeForToken(code);
    const user = await this.fetchGithubUser(accessToken);
    const email = user.email ?? (await this.fetchPrimaryEmail(accessToken));
    if (!email) {
      throw new BadRequestException(
        'Your GitHub account needs a verified email address to continue.',
      );
    }

    return {
      providerUserId: String(user.id),
      providerLogin: user.login,
      name: user.name ?? user.login,
      email,
      avatarUrl: user.avatarUrl,
    };
  }

  buildFrontendRedirectUrl(accessToken: string): string {
    return this.oauthState.buildFrontendRedirectUrl(accessToken);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.config.getOrThrow<string>('GITHUB_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
        code,
        redirect_uri: this.config.getOrThrow<string>('GITHUB_OAUTH_CALLBACK_URL'),
      }),
    });
    const body = await response.json();
    if (!response.ok || body.error || !body.access_token) {
      throw new UnauthorizedException(
        body.error_description ?? 'GitHub did not authorize this sign-in request.',
      );
    }

    const token = AuthTokenSchema.parse({
      accessToken: body.access_token,
      tokenType: body.token_type,
      scope: body.scope,
    });
    return token.accessToken;
  }

  private async fetchGithubUser(accessToken: string) {
    const response = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch your GitHub profile.');
    }

    const body = await response.json();
    return GithubUserSchema.parse({
      id: body.id,
      login: body.login,
      name: body.name,
      email: body.email,
      avatarUrl: body.avatar_url,
      htmlUrl: body.html_url,
    });
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    const response = await fetch(GITHUB_USER_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      return null;
    }

    const emails = (await response.json()) as GithubEmail[];
    const primary =
      emails.find((entry) => entry.primary && entry.verified) ??
      emails.find((entry) => entry.verified);
    return primary?.email ?? null;
  }
}
