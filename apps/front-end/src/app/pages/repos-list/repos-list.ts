import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton, Toggle } from '@org/ui';
import type { AvailableRepo } from '@org/types';
import { ACCENT_COLOR } from '../../common/data';
import { ReposService } from '../../core/services/repos.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-repos-list',
  imports: [RouterLink, Skeleton, Toggle],
  templateUrl: './repos-list.html',
})
export class ReposList {
  // ---------------------------------------------------------------------
  // Readonly variables
  // ---------------------------------------------------------------------

  protected readonly accentColor = ACCENT_COLOR;

  private readonly reposService = inject(ReposService);

  private readonly availableResource = this.reposService.availableRepos();
  protected readonly rows = this.availableResource.value;

  protected readonly pendingIds = signal<Set<number>>(new Set());
  protected readonly toggleErrorMessage = signal('');

  // ---------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------

  protected readonly isLoading = computed(
    () => this.availableResource.status() === 'loading',
  );
  protected readonly errorMessage = computed(() => {
    const error = this.availableResource.error();
    return error ? extractErrorMessage(error, 'Unable to load your repositories.') : '';
  });

  protected readonly trackedCount = computed(
    () => this.rows().filter((repo) => repo.trackedId !== null).length,
  );

  // ---------------------------------------------------------------------
  // Private functions
  // ---------------------------------------------------------------------

  protected async setTracking(repo: AvailableRepo, checked: boolean): Promise<void> {
    this.toggleErrorMessage.set('');
    this.pendingIds.update((ids) => new Set(ids).add(repo.id));
    try {
      const nextIds = new Set(
        this.rows()
          .filter((available) => available.trackedId !== null)
          .map((available) => available.id),
      );
      if (checked) {
        nextIds.add(repo.id);
      } else {
        nextIds.delete(repo.id);
      }

      const selected = this.rows().filter((available) => nextIds.has(available.id));
      await this.reposService.setTrackedRepos(
        selected.map((available) => ({
          id: available.id,
          fullName: available.fullName,
          private: available.private,
          htmlUrl: available.htmlUrl,
          description: available.description,
          language: available.language,
          defaultBranch: available.defaultBranch,
          stars: available.stars,
          forks: available.forks,
          openIssues: available.openIssues,
        })),
      );
      this.availableResource.reload();
    } catch (error) {
      this.toggleErrorMessage.set(
        extractErrorMessage(error, 'Unable to update tracking for this repository.'),
      );
    } finally {
      this.pendingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(repo.id);
        return next;
      });
    }
  }
}
