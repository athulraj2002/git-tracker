import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Checkbox, Skeleton } from '@org/ui';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-select-repos',
  imports: [Button, Checkbox, Skeleton],
  templateUrl: './select-repos.html',
})
export class SelectRepos {
  private readonly reposService = inject(ReposService);
  private readonly router = inject(Router);

  private readonly availableResource = this.reposService.availableRepos();
  private readonly trackedResource = this.reposService.trackedRepos();

  protected readonly repos = this.availableResource.value;
  protected readonly selectedIds = linkedSignal<Set<number>>(() =>
    new Set(
      this.trackedResource
        .value()
        .filter((repo) => repo.provider === 'github')
        .map((repo) => Number(repo.providerRepoId)),
    ),
  );

  protected readonly isLoading = computed(
    () =>
      this.availableResource.status() === 'loading' ||
      this.trackedResource.status() === 'loading',
  );
  protected readonly isSaving = signal(false);

  private readonly saveErrorMessage = signal('');
  protected readonly errorMessage = computed(() => {
    if (this.saveErrorMessage()) {
      return this.saveErrorMessage();
    }
    const error = this.availableResource.error() ?? this.trackedResource.error();
    return error
      ? extractErrorMessage(error, 'Unable to load your GitHub repositories.')
      : '';
  });

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
    this.saveErrorMessage.set('');
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
          description: repo.description,
          language: repo.language,
          defaultBranch: repo.defaultBranch,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
        })),
      );
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.saveErrorMessage.set(
        extractErrorMessage(error, 'Unable to save your selected repositories.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
