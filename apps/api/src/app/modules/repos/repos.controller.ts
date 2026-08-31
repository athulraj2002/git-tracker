import { Body, Controller, Delete, Get, HttpCode, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetTrackedReposRequestSchema } from '@org/zod-schemas';
import type { SetTrackedReposRequest } from '@org/types';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard';
import { ReposService } from './repos.service';

@ApiTags('repos')
@Controller('repos')
@UseGuards(JwtAuthGuard)
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get('available')
  @ApiOperation({ summary: "List the user's GitHub repositories" })
  getAvailable(@CurrentUser() user: AuthenticatedUser) {
    return this.reposService.getAvailableRepos(user.sub);
  }

  @Get('tracked')
  @ApiOperation({ summary: 'List the repositories currently being tracked' })
  getTracked(@CurrentUser() user: AuthenticatedUser) {
    return this.reposService.getTrackedRepos(user.sub);
  }

  @Get('tracked/:id')
  @ApiOperation({ summary: 'Get details and recent commits for a tracked repository' })
  getTrackedDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reposService.getRepoDetail(user.sub, id);
  }

  @Get('tracked/:id/commits')
  @ApiOperation({ summary: 'List commits for a tracked repository, optionally within a date range' })
  getTrackedCommits(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    return this.reposService.getRepoCommits(user.sub, id, since, until);
  }

  @Get('commits')
  @ApiOperation({
    summary: 'List recent commits across all tracked repositories',
  })
  getCommits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    return this.reposService.getContributionActivity(user.sub, since, until);
  }

  @Put('tracked')
  @ApiOperation({ summary: 'Replace the set of tracked repositories' })
  setTracked(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SetTrackedReposRequestSchema))
    body: SetTrackedReposRequest,
  ) {
    return this.reposService.setTrackedRepos(user.sub, body.repos);
  }

  @Put('tracked/:id')
  @ApiOperation({ summary: 'Start tracking a specific repository' })
  trackRepo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reposService.trackRepo(user.sub, id);
  }

  @Delete('tracked/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Stop tracking a repository' })
  async untrackRepo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.reposService.untrackRepo(user.sub, id);
  }
}
