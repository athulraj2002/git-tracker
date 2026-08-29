import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Button, Checkbox, Skeleton } from '@org/ui';
import { AuthService } from '../../core/auth.service';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-settings',
  imports: [Button, Checkbox, Skeleton],
  templateUrl: './settings.html',
})
export class Settings {
  protected readonly authService = inject(AuthService);
  private readonly reposService = inject(ReposService);

  private readonly identitiesResource = this.authService.identities();
  private readonly availableResource = this.reposService.availableRepos();
  private readonly trackedResource = this.reposService.trackedRepos();

  protected readonly identities = this.identitiesResource.value;
  protected readonly availableRepos = this.availableResource.value;

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
      this.identitiesResource.status() === 'loading' ||
      this.availableResource.status() === 'loading' ||
      this.trackedResource.status() === 'loading',
  );
  protected readonly errorMessage = computed(() => {
    const error =
      this.identitiesResource.error() ??
      this.availableResource.error() ??
      this.trackedResource.error();
    return error ? extractErrorMessage(error, 'Unable to load your settings.') : '';
  });

  protected readonly isSaving = signal(false);
  protected readonly savedMessage = signal('');
  protected readonly saveErrorMessage = signal('');

  protected setSelected(repoId: number, checked: boolean): void {
    this.savedMessage.set('');
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(repoId);
    } else {
      next.delete(repoId);
    }
    this.selectedIds.set(next);
  }

  protected async saveRepos(): Promise<void> {
    this.savedMessage.set('');
    this.saveErrorMessage.set('');
    this.isSaving.set(true);
    try {
      const selected = this.availableRepos().filter((repo) =>
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
      this.trackedResource.reload();
      this.savedMessage.set('Your tracked repositories have been updated.');
    } catch (error) {
      this.saveErrorMessage.set(
        extractErrorMessage(error, 'Unable to save your selected repositories.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
