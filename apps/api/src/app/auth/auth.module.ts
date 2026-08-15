import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BitbucketOAuthService } from './bitbucket-oauth.service';
import { GithubOAuthService } from './github-oauth.service';
import { GitlabOAuthService } from './gitlab-oauth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OAuthStateService } from './oauth-state.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    OAuthStateService,
    GithubOAuthService,
    GitlabOAuthService,
    BitbucketOAuthService,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
