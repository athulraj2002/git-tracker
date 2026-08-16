import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetTrackedReposRequestSchema } from '@org/zod-schemas';
import type { SetTrackedReposRequest } from '@org/types';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
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

  @Put('tracked')
  @ApiOperation({ summary: 'Replace the set of tracked repositories' })
  setTracked(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SetTrackedReposRequestSchema))
    body: SetTrackedReposRequest,
  ) {
    return this.reposService.setTrackedRepos(user.sub, body.repos);
  }
}
