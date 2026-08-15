import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { users, userIdentities, type User } from '../database/schema';
import { AuthResponse } from '@org/types';
import type { OAuthProfile } from './oauth-profile';

export type AuthProvider = 'github' | 'gitlab' | 'bitbucket';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithProvider(
    provider: AuthProvider,
    profile: OAuthProfile,
  ): Promise<AuthResponse> {
    const identity = await this.db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.provider, provider),
        eq(userIdentities.providerUserId, profile.providerUserId),
      ),
    });

    let userId: string;
    if (identity) {
      userId = identity.userId;
      await this.db
        .update(users)
        .set({ avatarUrl: profile.avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } else {
      const existingByEmail = await this.db.query.users.findFirst({
        where: eq(users.email, profile.email),
      });

      if (existingByEmail) {
        userId = existingByEmail.id;
        await this.db
          .update(users)
          .set({ avatarUrl: profile.avatarUrl, updatedAt: new Date() })
          .where(eq(users.id, userId));
      } else {
        const [created] = await this.db
          .insert(users)
          .values({
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          })
          .returning();
        userId = created.id;
      }

      await this.db.insert(userIdentities).values({
        userId,
        provider,
        providerUserId: profile.providerUserId,
        providerLogin: profile.providerLogin,
      });
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return this.buildAuthResponse(user as User);
  }

  findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
    };
  }
}
