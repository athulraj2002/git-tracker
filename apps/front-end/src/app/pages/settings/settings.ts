import { Component, OnInit, inject, signal } from '@angular/core';
import { Button, Checkbox } from '@org/ui';
import type { ConnectedIdentity, GithubRepo } from '@org/types';
import { AuthService } from '../../core/auth.service';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-settings',
  imports: [Button, Checkbox],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly reposService = inject(ReposService);

  protected readonly identities = signal<ConnectedIdentity[]>([]);

  protected readonly availableRepos = signal<GithubRepo[]>([]);
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly savedMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const [identities, available, tracked] = await Promise.all([
        this.authService.getIdentities(),
        this.reposService.getAvailableRepos(),
        this.reposService.getTrackedRepos(),
      ]);
      this.identities.set(identities);
      this.availableRepos.set(available);
      this.selectedIds.set(
        new Set(
          tracked
            .filter((repo) => repo.provider === 'github')
            .map((repo) => Number(repo.providerRepoId)),
        ),
      );
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to load your settings.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

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
    this.errorMessage.set('');
    this.savedMessage.set('');
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
      this.savedMessage.set('Your tracked repositories have been updated.');
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to save your selected repositories.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
