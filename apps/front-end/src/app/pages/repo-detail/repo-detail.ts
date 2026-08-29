import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Skeleton } from '@org/ui';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-repo-detail',
  imports: [RouterLink, DatePipe, Skeleton],
  templateUrl: './repo-detail.html',
})
export class RepoDetail {
  private readonly reposService = inject(ReposService);

  readonly id = input<string>();

  private readonly detailResource = this.reposService.repoDetail(this.id);

  protected readonly repo = computed(() => this.detailResource.value()?.repo ?? null);
  protected readonly commits = computed(
    () => this.detailResource.value()?.commits ?? [],
  );
  protected readonly isLoading = computed(() => {
    const status = this.detailResource.status();
    return status === 'loading' || status === 'idle';
  });
  protected readonly errorMessage = computed(() => {
    const error = this.detailResource.error();
    return error ? extractErrorMessage(error, 'Unable to load this repository.') : '';
  });
}
