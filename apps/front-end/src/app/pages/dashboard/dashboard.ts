import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChartComponent, type ApexAxisChartSeries, type ApexChart, type ApexXAxis } from 'ng-apexcharts';
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
}

export interface RepoContribution {
  repoId: string;
  repoFullName: string;
  count: number;
}

export interface ContributorStat {
  author: string;
  count: number;
}

const ACCENT_COLOR = '#3987e5';
const CHART_FORE_COLOR = '#9ca3af';
const CHART_LABEL_COLOR = '#6b7280';
const CHART_GRID_COLOR = '#1f2937';

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

const BASE_CHART: Partial<ApexChart> = {
  background: 'transparent',
  foreColor: CHART_FORE_COLOR,
  fontFamily: 'inherit',
  toolbar: { show: false },
};

const AXIS_LABEL_STYLE = { colors: CHART_LABEL_COLOR, fontSize: '11px' };

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Skeleton, ChartComponent],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly reposService = inject(ReposService);
  private readonly router = inject(Router);

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

    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, label: value.label, count: value.count }));
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

    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_REPO_COUNT)
      .map(([repoId, value]) => ({
        repoId,
        repoFullName: value.repoFullName,
        count: value.count,
      }));
  });

  protected readonly topContributors = computed<ContributorStat[]>(() => {
    const counts = new Map<string, number>();
    for (const commit of this.filteredCommits()) {
      const author = commit.authorLogin ?? UNKNOWN_AUTHOR;
      counts.set(author, (counts.get(author) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CONTRIBUTOR_COUNT)
      .map(([author, count]) => ({
        author: author === UNKNOWN_AUTHOR ? 'Unknown' : author,
        count,
      }));
  });

  protected readonly activityChartSeries = computed<ApexAxisChartSeries>(() => [
    { name: 'Contributions', data: this.activityByBucket().map((bucket) => bucket.count) },
  ]);
  protected readonly activityChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.activityByBucket().map((bucket) => bucket.label),
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  protected readonly activityChart: ApexChart = {
    ...BASE_CHART,
    type: 'bar',
    height: 240,
  };
  protected readonly activityPlotOptions = {
    bar: { borderRadius: 4, columnWidth: '55%' },
  };

  protected readonly repoChartSeries = computed<ApexAxisChartSeries>(() => [
    { name: 'Contributions', data: this.contributionsByRepo().map((repo) => repo.count) },
  ]);
  protected readonly repoChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.contributionsByRepo().map((repo) => repo.repoFullName),
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  protected readonly repoChart = computed<ApexChart>(() => ({
    ...BASE_CHART,
    type: 'bar',
    height: Math.max(160, this.contributionsByRepo().length * 40),
    events: {
      dataPointSelection: (_event, _chart, options) => {
        const repo = this.contributionsByRepo()[options?.dataPointIndex ?? -1];
        if (repo) {
          this.router.navigate(['/repos', repo.repoId]);
        }
      },
    },
  }));

  protected readonly contributorChartSeries = computed<ApexAxisChartSeries>(() => [
    {
      name: 'Contributions',
      data: this.topContributors().map((contributor) => contributor.count),
    },
  ]);
  protected readonly contributorChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.topContributors().map((contributor) => contributor.author),
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  protected readonly contributorChart = computed<ApexChart>(() => ({
    ...BASE_CHART,
    type: 'bar',
    height: Math.max(160, this.topContributors().length * 40),
  }));

  protected readonly horizontalPlotOptions = {
    bar: { horizontal: true, borderRadius: 4, barHeight: '55%', distributed: false },
  };
  protected readonly barColors = [ACCENT_COLOR];
  protected readonly noDataLabels = { enabled: false };
  protected readonly endDataLabels = {
    enabled: true,
    style: { colors: ['#e5e7eb'], fontSize: '11px' },
    offsetX: 8,
  };
  protected readonly chartGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 3 };
  protected readonly chartTooltip = { theme: 'dark' as const };
  protected readonly chartLegend = { show: false };

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
