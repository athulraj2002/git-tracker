import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Skeleton } from '@org/ui';
import { ACCENT_COLOR } from '../../common/data';
import { ReposService } from '../../core/services/repos.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-repo-detail',
  imports: [RouterLink, DatePipe, Skeleton],
  templateUrl: './repo-detail.html',
})
export class RepoDetail {
  protected readonly accentColor = ACCENT_COLOR;

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
