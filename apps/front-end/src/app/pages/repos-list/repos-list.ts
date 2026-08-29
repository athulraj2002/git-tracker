import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton } from '@org/ui';
import { ACCENT_COLOR } from '../../common/data';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-repos-list',
  imports: [RouterLink, Skeleton],
  templateUrl: './repos-list.html',
})
export class ReposList {
  protected readonly accentColor = ACCENT_COLOR;

  private readonly reposService = inject(ReposService);

  private readonly reposResource = this.reposService.trackedRepos();

  protected readonly repos = this.reposResource.value;
  protected readonly isLoading = computed(
    () => this.reposResource.status() === 'loading',
  );
  protected readonly errorMessage = computed(() => {
    const error = this.reposResource.error();
    return error ? extractErrorMessage(error, 'Unable to load your repositories.') : '';
  });
}
