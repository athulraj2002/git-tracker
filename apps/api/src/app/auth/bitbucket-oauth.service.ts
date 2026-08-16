import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenSchema, BitbucketUserSchema } from '@org/zod-schemas';
import type { OAuthProfile } from './oauth-profile';
import { OAuthStateService } from './oauth-state.service';

const PROVIDER = 'bitbucket';
const BITBUCKET_AUTHORIZE_URL = 'https://bitbucket.org/site/oauth2/authorize';
const BITBUCKET_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token';
const BITBUCKET_USER_URL = 'https://api.bitbucket.org/2.0/user';
const BITBUCKET_EMAILS_URL = 'https://api.bitbucket.org/2.0/user/emails';

interface BitbucketEmail {
  email: string;
  is_primary: boolean;
  is_confirmed: boolean;
}

@Injectable()
export class BitbucketOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oauthState: OAuthStateService,
  ) {}

  async buildAuthorizeUrl(): Promise<string> {
    const state = await this.oauthState.createState(PROVIDER);
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('BITBUCKET_CLIENT_ID'),
      response_type: 'code',
      state,
    });
    return `${BITBUCKET_AUTHORIZE_URL}?${params.toString()}`;
  }

  verifyState(state: string): Promise<void> {
    return this.oauthState.verifyState(PROVIDER, state);
  }

  async fetchProfile(code: string): Promise<OAuthProfile> {
    const accessToken = await this.exchangeCodeForToken(code);
    const user = await this.fetchBitbucketUser(accessToken);
    const email = await this.fetchPrimaryEmail(accessToken);
    if (!email) {
      throw new BadRequestException(
        'Your Bitbucket account needs a verified email address to continue.',
      );
    }

    return {
      providerUserId: user.accountId,
      providerLogin: user.username,
      name: user.displayName || user.username,
      email,
      avatarUrl: user.avatarUrl,
      accessToken,
    };
  }

  buildFrontendRedirectUrl(accessToken: string): string {
    return this.oauthState.buildFrontendRedirectUrl(accessToken);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = this.config.getOrThrow<string>('BITBUCKET_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('BITBUCKET_CLIENT_SECRET');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(BITBUCKET_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }).toString(),
    });
    const body = await response.json();
    if (!response.ok || body.error || !body.access_token) {
      throw new UnauthorizedException(
        body.error_description ?? 'Bitbucket did not authorize this sign-in request.',
      );
    }

    const token = AuthTokenSchema.parse({
      accessToken: body.access_token,
      tokenType: body.token_type,
      scope: body.scopes ?? '',
    });
    return token.accessToken;
  }

  private async fetchBitbucketUser(accessToken: string) {
    const response = await fetch(BITBUCKET_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch your Bitbucket profile.');
    }

    const body = await response.json();
    return BitbucketUserSchema.parse({
      accountId: body.account_id,
      username: body.username,
      displayName: body.display_name,
      avatarUrl: body.links?.avatar?.href,
    });
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    const response = await fetch(BITBUCKET_EMAILS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    const emails = (body.values ?? []) as BitbucketEmail[];
    const primary =
      emails.find((entry) => entry.is_primary && entry.is_confirmed) ??
      emails.find((entry) => entry.is_confirmed);
    return primary?.email ?? null;
  }
}
