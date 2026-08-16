import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Checkbox } from '@org/ui';
import type { GithubRepo } from '@org/types';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-select-repos',
  imports: [Button, Checkbox],
  templateUrl: './select-repos.html',
})
export class SelectRepos implements OnInit {
  private readonly reposService = inject(ReposService);
  private readonly router = inject(Router);

  protected readonly repos = signal<GithubRepo[]>([]);
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const [available, tracked] = await Promise.all([
        this.reposService.getAvailableRepos(),
        this.reposService.getTrackedRepos(),
      ]);
      this.repos.set(available);
      this.selectedIds.set(
        new Set(
          tracked
            .filter((repo) => repo.provider === 'github')
            .map((repo) => Number(repo.providerRepoId)),
        ),
      );
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to load your GitHub repositories.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected setSelected(repoId: number, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(repoId);
    } else {
      next.delete(repoId);
    }
    this.selectedIds.set(next);
  }

  protected async continue(): Promise<void> {
    this.errorMessage.set('');
    this.isSaving.set(true);
    try {
      const selected = this.repos().filter((repo) =>
        this.selectedIds().has(repo.id),
      );
      await this.reposService.setTrackedRepos(
        selected.map((repo) => ({
          id: repo.id,
          fullName: repo.fullName,
          private: repo.private,
          htmlUrl: repo.htmlUrl,
        })),
      );
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to save your selected repositories.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
