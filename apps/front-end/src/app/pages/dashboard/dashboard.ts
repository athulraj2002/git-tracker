import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrackedRepo } from '@org/types';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

export interface LanguageSlice {
  language: string;
  count: number;
  widthPercent: number;
}

export interface StarredRepo {
  id: string;
  fullName: string;
  stars: number;
  widthPercent: number;
}

const OTHER_LABEL = 'Other';
const UNKNOWN_LABEL = 'Unknown';
const TOP_LANGUAGE_COUNT = 6;
const TOP_REPO_COUNT = 5;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly reposService = inject(ReposService);

  protected readonly repos = signal<TrackedRepo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly totalRepos = computed(() => this.repos().length);
  protected readonly totalStars = computed(() =>
    this.repos().reduce((sum, repo) => sum + repo.stars, 0),
  );
  protected readonly totalForks = computed(() =>
    this.repos().reduce((sum, repo) => sum + repo.forks, 0),
  );
  protected readonly totalOpenIssues = computed(() =>
    this.repos().reduce((sum, repo) => sum + repo.openIssues, 0),
  );

  protected readonly publicCount = computed(
    () => this.repos().filter((repo) => !repo.private).length,
  );
  protected readonly privateCount = computed(
    () => this.repos().filter((repo) => repo.private).length,
  );
  protected readonly publicWidthPercent = computed(() =>
    this.totalRepos() === 0
      ? 0
      : Math.round((this.publicCount() / this.totalRepos()) * 100),
  );
  protected readonly privateWidthPercent = computed(() =>
    this.totalRepos() === 0
      ? 0
      : Math.round((this.privateCount() / this.totalRepos()) * 100),
  );

  protected readonly languageBreakdown = computed<LanguageSlice[]>(() => {
    const counts = new Map<string, number>();
    for (const repo of this.repos()) {
      const key = repo.language ?? UNKNOWN_LABEL;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_LANGUAGE_COUNT);
    const rest = sorted.slice(TOP_LANGUAGE_COUNT);
    const otherCount = rest.reduce((sum, [, count]) => sum + count, 0);
    if (otherCount > 0) {
      top.push([OTHER_LABEL, otherCount]);
    }

    const maxCount = Math.max(1, ...top.map(([, count]) => count));
    return top.map(([language, count]) => ({
      language,
      count,
      widthPercent: Math.round((count / maxCount) * 100),
    }));
  });

  protected readonly topReposByStars = computed<StarredRepo[]>(() => {
    const starred = this.repos()
      .filter((repo) => repo.stars > 0)
      .sort((a, b) => b.stars - a.stars)
      .slice(0, TOP_REPO_COUNT);

    const maxStars = Math.max(1, ...starred.map((repo) => repo.stars));
    return starred.map((repo) => ({
      id: repo.id,
      fullName: repo.fullName,
      stars: repo.stars,
      widthPercent: Math.round((repo.stars / maxStars) * 100),
    }));
  });

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
