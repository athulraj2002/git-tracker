import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GithubReposService } from './github-repos.service';
import { ReposController } from './repos.controller';
import { ReposService } from './repos.service';

@Module({
  imports: [AuthModule],
  controllers: [ReposController],
  providers: [ReposService, GithubReposService],
})
export class ReposModule {}
