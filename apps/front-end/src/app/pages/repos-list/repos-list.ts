import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton } from '@org/ui';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-repos-list',
  imports: [RouterLink, Skeleton],
  templateUrl: './repos-list.html',
})
export class ReposList {
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
