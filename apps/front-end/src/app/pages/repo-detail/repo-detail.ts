import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { RepoCommit, TrackedRepo } from '@org/types';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-repo-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './repo-detail.html',
})
export class RepoDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reposService = inject(ReposService);

  protected readonly repo = signal<TrackedRepo | null>(null);
  protected readonly commits = signal<RepoCommit[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Repository not found.');
      this.isLoading.set(false);
      return;
    }

    try {
      const detail = await this.reposService.getRepoDetail(id);
      this.repo.set(detail.repo);
      this.commits.set(detail.commits);
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to load this repository.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
