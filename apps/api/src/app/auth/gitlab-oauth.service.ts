import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenSchema, GitlabUserSchema } from '@org/zod-schemas';
import type { OAuthProfile } from './oauth-profile';
import { OAuthStateService } from './oauth-state.service';

const PROVIDER = 'gitlab';
const GITLAB_AUTHORIZE_URL = 'https://gitlab.com/oauth/authorize';
const GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token';
const GITLAB_USER_URL = 'https://gitlab.com/api/v4/user';

@Injectable()
export class GitlabOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oauthState: OAuthStateService,
  ) {}

  async buildAuthorizeUrl(): Promise<string> {
    const state = await this.oauthState.createState(PROVIDER);
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GITLAB_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GITLAB_OAUTH_CALLBACK_URL'),
      response_type: 'code',
      scope: 'read_user',
      state,
    });
    return `${GITLAB_AUTHORIZE_URL}?${params.toString()}`;
  }

  verifyState(state: string): Promise<void> {
    return this.oauthState.verifyState(PROVIDER, state);
  }

  async fetchProfile(code: string): Promise<OAuthProfile> {
    const accessToken = await this.exchangeCodeForToken(code);
    const user = await this.fetchGitlabUser(accessToken);
    if (!user.email) {
      throw new BadRequestException(
        'Your GitLab account needs a verified email address to continue.',
      );
    }

    return {
      providerUserId: String(user.id),
      providerLogin: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
    };
  }

  buildFrontendRedirectUrl(accessToken: string): string {
    return this.oauthState.buildFrontendRedirectUrl(accessToken);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(GITLAB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.config.getOrThrow<string>('GITLAB_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GITLAB_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.getOrThrow<string>('GITLAB_OAUTH_CALLBACK_URL'),
      }),
    });
    const body = await response.json();
    if (!response.ok || body.error || !body.access_token) {
      throw new UnauthorizedException(
        body.error_description ?? 'GitLab did not authorize this sign-in request.',
      );
    }

    const token = AuthTokenSchema.parse({
      accessToken: body.access_token,
      tokenType: body.token_type,
      scope: body.scope,
    });
    return token.accessToken;
  }

  private async fetchGitlabUser(accessToken: string) {
    const response = await fetch(GITLAB_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch your GitLab profile.');
    }

    const body = await response.json();
    return GitlabUserSchema.parse({
      id: body.id,
      username: body.username,
      name: body.name,
      email: body.email,
      avatarUrl: body.avatar_url,
      webUrl: body.web_url,
    });
  }
}
