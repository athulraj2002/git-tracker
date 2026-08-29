import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton } from '@org/ui';
import type { RepoCommitWithContext } from '@org/types';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

export type DateRangeKey = '7d' | '30d' | '90d' | '365d';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
}

export interface ActivityBucket {
  key: string;
  label: string;
  count: number;
  heightPercent: number;
  showLabel: boolean;
}

export interface RepoContribution {
  repoId: string;
  repoFullName: string;
  count: number;
  widthPercent: number;
}

export interface ContributorStat {
  author: string;
  avatarUrl: string | null;
  count: number;
  widthPercent: number;
}

const UNKNOWN_AUTHOR = '__unknown__';
const TOP_REPO_COUNT = 8;
const TOP_CONTRIBUTOR_COUNT = 6;

const RANGE_DAYS: Record<DateRangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '365d', label: 'Last 12 months' },
];

type Granularity = 'day' | 'week' | 'month';

function granularityFor(range: DateRangeKey): Granularity {
  if (range === '365d') return 'month';
  if (range === '90d') return 'week';
  return 'day';
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function bucketFor(date: Date, granularity: Granularity): { key: string; label: string } {
  if (granularity === 'month') {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    return { key, label };
  }
  if (granularity === 'week') {
    const start = startOfWeek(date);
    return {
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  }
  return {
    key: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Skeleton],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly reposService = inject(ReposService);

  protected readonly dateRangeOptions = DATE_RANGE_OPTIONS;
  protected readonly unknownAuthor = UNKNOWN_AUTHOR;

  protected readonly dateRangeKey = signal<DateRangeKey>('30d');
  protected readonly selectedRepoId = signal<string>('all');
  protected readonly selectedAuthor = signal<string>('all');

  private readonly since = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() - RANGE_DAYS[this.dateRangeKey()]);
    return date.toISOString();
  });

  private readonly reposResource = this.reposService.trackedRepos();
  private readonly commitsResource = this.reposService.contributionActivity(
    () => this.since(),
  );

  protected readonly repos = this.reposResource.value;
  protected readonly isLoading = computed(
    () => this.reposResource.status() === 'loading',
  );
  protected readonly errorMessage = computed(() => {
    const error = this.reposResource.error();
    return error ? extractErrorMessage(error, 'Unable to load your repositories.') : '';
  });

  protected readonly isActivityLoading = computed(
    () => this.commitsResource.status() === 'loading',
  );
  protected readonly activityErrorMessage = computed(() => {
    const error = this.commitsResource.error();
    return error
      ? extractErrorMessage(error, 'Unable to load contribution activity.')
      : '';
  });

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

  private readonly repoFilteredCommits = computed<RepoCommitWithContext[]>(() => {
    const list = this.commitsResource.value();
    const repoId = this.selectedRepoId();
    return repoId === 'all' ? list : list.filter((commit) => commit.repoId === repoId);
  });

  protected readonly contributorOptions = computed(() => {
    const logins = new Set<string>();
    let hasUnknown = false;
    for (const commit of this.repoFilteredCommits()) {
      if (commit.authorLogin) {
        logins.add(commit.authorLogin);
      } else {
        hasUnknown = true;
      }
    }
    return { logins: [...logins].sort(), hasUnknown };
  });

  protected readonly filteredCommits = computed<RepoCommitWithContext[]>(() => {
    const list = this.repoFilteredCommits();
    const author = this.selectedAuthor();
    if (author === 'all') return list;
    if (author === UNKNOWN_AUTHOR) return list.filter((commit) => !commit.authorLogin);
    return list.filter((commit) => commit.authorLogin === author);
  });

  protected readonly totalContributions = computed(() => this.filteredCommits().length);

  protected readonly activityByBucket = computed<ActivityBucket[]>(() => {
    const granularity = granularityFor(this.dateRangeKey());
    const counts = new Map<string, { label: string; count: number }>();
    for (const commit of this.filteredCommits()) {
      const { key, label } = bucketFor(new Date(commit.committedAt), granularity);
      const existing = counts.get(key);
      counts.set(key, { label, count: (existing?.count ?? 0) + 1 });
    }

    const entries = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, ...value }));
    const maxCount = Math.max(1, ...entries.map((entry) => entry.count));
    const labelStep = Math.max(1, Math.ceil(entries.length / 12));
    return entries.map((entry, index) => ({
      key: entry.key,
      label: entry.label,
      count: entry.count,
      heightPercent: Math.round((entry.count / maxCount) * 100),
      showLabel: index % labelStep === 0 || index === entries.length - 1,
    }));
  });

  protected readonly contributionsByRepo = computed<RepoContribution[]>(() => {
    const counts = new Map<string, { repoFullName: string; count: number }>();
    for (const commit of this.filteredCommits()) {
      const existing = counts.get(commit.repoId);
      counts.set(commit.repoId, {
        repoFullName: commit.repoFullName,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_REPO_COUNT);
    const maxCount = Math.max(1, ...sorted.map(([, value]) => value.count));
    return sorted.map(([repoId, value]) => ({
      repoId,
      repoFullName: value.repoFullName,
      count: value.count,
      widthPercent: Math.round((value.count / maxCount) * 100),
    }));
  });

  protected readonly topContributors = computed<ContributorStat[]>(() => {
    const counts = new Map<string, { avatarUrl: string | null; count: number }>();
    for (const commit of this.filteredCommits()) {
      const author = commit.authorLogin ?? UNKNOWN_AUTHOR;
      const existing = counts.get(author);
      counts.set(author, {
        avatarUrl: existing?.avatarUrl ?? commit.authorAvatarUrl,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_CONTRIBUTOR_COUNT);
    const maxCount = Math.max(1, ...sorted.map(([, value]) => value.count));
    return sorted.map(([author, value]) => ({
      author: author === UNKNOWN_AUTHOR ? 'Unknown' : author,
      avatarUrl: value.avatarUrl,
      count: value.count,
      widthPercent: Math.round((value.count / maxCount) * 100),
    }));
  });

  protected setDateRange(key: string): void {
    this.dateRangeKey.set(key as DateRangeKey);
  }

  protected setRepoFilter(repoId: string): void {
    this.selectedRepoId.set(repoId);
    this.selectedAuthor.set('all');
  }

  protected setAuthorFilter(author: string): void {
    this.selectedAuthor.set(author);
  }
}
