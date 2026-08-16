import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { OAuthCallbackQuerySchema } from '@org/zod-schemas';
import type { OAuthCallbackQuery } from '@org/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { BitbucketOAuthService } from './bitbucket-oauth.service';
import { CurrentUser } from './current-user.decorator';
import { GithubOAuthService } from './github-oauth.service';
import { GitlabOAuthService } from './gitlab-oauth.service';
import { JwtAuthGuard, type AuthenticatedUser } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubOAuthService: GithubOAuthService,
    private readonly gitlabOAuthService: GitlabOAuthService,
    private readonly bitbucketOAuthService: BitbucketOAuthService,
  ) {}

  @Get('github')
  @ApiOperation({ summary: 'Start GitHub sign-in/sign-up' })
  async githubAuthorize(): Promise<{ url: string }> {
    return { url: await this.githubOAuthService.buildAuthorizeUrl() };
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'Handle the GitHub OAuth redirect' })
  async githubCallback(
    @Query(new ZodValidationPipe(OAuthCallbackQuerySchema))
    query: OAuthCallbackQuery,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!query.state) {
      throw new BadRequestException('Missing GitHub OAuth state.');
    }

    await this.githubOAuthService.verifyState(query.state);
    const profile = await this.githubOAuthService.fetchProfile(query.code);
    const { accessToken } = await this.authService.loginWithProvider(
      'github',
      profile,
    );
    res.redirect(
      this.githubOAuthService.buildFrontendRedirectUrl(accessToken),
      302,
    );
  }

  @Get('gitlab')
  @ApiOperation({ summary: 'Start GitLab sign-in/sign-up' })
  async gitlabAuthorize(): Promise<{ url: string }> {
    return { url: await this.gitlabOAuthService.buildAuthorizeUrl() };
  }

  @Get('gitlab/callback')
  @ApiOperation({ summary: 'Handle the GitLab OAuth redirect' })
  async gitlabCallback(
    @Query(new ZodValidationPipe(OAuthCallbackQuerySchema))
    query: OAuthCallbackQuery,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!query.state) {
      throw new BadRequestException('Missing GitLab OAuth state.');
    }

    await this.gitlabOAuthService.verifyState(query.state);
    const profile = await this.gitlabOAuthService.fetchProfile(query.code);
    const { accessToken } = await this.authService.loginWithProvider(
      'gitlab',
      profile,
    );
    res.redirect(
      this.gitlabOAuthService.buildFrontendRedirectUrl(accessToken),
      302,
    );
  }

  @Get('bitbucket')
  @ApiOperation({ summary: 'Start Bitbucket sign-in/sign-up' })
  async bitbucketAuthorize(): Promise<{ url: string }> {
    return { url: await this.bitbucketOAuthService.buildAuthorizeUrl() };
  }

  @Get('bitbucket/callback')
  @ApiOperation({ summary: 'Handle the Bitbucket OAuth redirect' })
  async bitbucketCallback(
    @Query(new ZodValidationPipe(OAuthCallbackQuerySchema))
    query: OAuthCallbackQuery,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!query.state) {
      throw new BadRequestException('Missing Bitbucket OAuth state.');
    }

    await this.bitbucketOAuthService.verifyState(query.state);
    const profile = await this.bitbucketOAuthService.fetchProfile(query.code);
    const { accessToken } = await this.authService.loginWithProvider(
      'bitbucket',
      profile,
    );
    res.redirect(
      this.bitbucketOAuthService.buildFrontendRedirectUrl(accessToken),
      302,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current authenticated user' })
  async me(@CurrentUser() authUser: AuthenticatedUser) {
    const user = await this.authService.findById(authUser.sub);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Get('identities')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List the providers connected to this account' })
  async identities(@CurrentUser() authUser: AuthenticatedUser) {
    const rows = await this.authService.getIdentities(authUser.sub);
    return rows.map((row) => ({
      provider: row.provider,
      providerLogin: row.providerLogin,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
