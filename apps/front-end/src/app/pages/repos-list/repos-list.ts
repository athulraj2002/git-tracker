import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrackedRepo } from '@org/types';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-repos-list',
  imports: [RouterLink],
  templateUrl: './repos-list.html',
})
export class ReposList implements OnInit {
  private readonly reposService = inject(ReposService);

  protected readonly repos = signal<TrackedRepo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.repos.set(await this.reposService.getTrackedRepos());
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to load your repositories.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
