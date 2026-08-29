import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const STATE_PURPOSE = 'oauth-state';

interface OAuthStatePayload {
  purpose: string;
  provider: string;
}

@Injectable()
export class OAuthStateService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  createState(provider: string): Promise<string> {
    return this.jwtService.signAsync(
      { purpose: STATE_PURPOSE, provider, nonce: randomUUID() },
      { expiresIn: '10m' },
    );
  }

  async verifyState(provider: string, state: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<OAuthStatePayload>(state);
      if (payload.purpose !== STATE_PURPOSE || payload.provider !== provider) {
        throw new Error('mismatched oauth state');
      }
    } catch {
      throw new BadRequestException('Invalid or expired sign-in request.');
    }
  }

  buildFrontendRedirectUrl(accessToken: string): string {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    return `${frontendUrl}/auth/callback?token=${encodeURIComponent(accessToken)}`;
  }
}
