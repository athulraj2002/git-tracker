import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChartComponent, type ApexAxisChartSeries, type ApexChart, type ApexXAxis } from 'ng-apexcharts';
import { Skeleton } from '@org/ui';
import type {
  ActivitySeries,
  ContributorStat,
  DateRangeKey,
  RepoCommitWithContext,
  RepoContribution,
} from '@org/types';
import { bucketFor, extractErrorMessage, granularityFor } from '@org/helpers';
import {
  CATEGORICAL_COLORS,
  CHART_FORE_COLOR,
  CHART_GRID_COLOR,
  CHART_LABEL_COLOR,
  DATE_RANGE_OPTIONS,
  OTHER_COLOR,
  OTHER_LABEL,
  RANGE_DAYS,
} from '../../common/data';
import { ReposService } from '../../core/repos.service';

const MAX_STACK_SERIES = 7;

// Keeps horizontal bars a constant thickness regardless of how many rows
// there are, instead of stretching a single bar to fill a tall chart.
const BAR_ROW_HEIGHT = 40;
// Measured against the rendered chart: legend (fixed 30px) + x-axis labels +
// the padding ApexCharts reserves around the plot area. Getting this wrong
// starves a single-row chart's one bar of nearly all its slot, since that
// deficit doesn't scale down with fewer rows the way BAR_ROW_HEIGHT does.
const BAR_CHART_CHROME = 96;

const UNKNOWN_AUTHOR = '__unknown__';
const TOP_REPO_COUNT = 8;
const TOP_CONTRIBUTOR_COUNT = 6;

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

  /**
   * Ranks the secondary-dimension keys by total, caps at MAX_STACK_SERIES,
   * folds the rest into an "Other" series, and assigns the validated
   * categorical color order. Shared by every stacked chart on this page.
   */
  private buildStackedSeries(
    categoryKeys: string[],
    secondaryTotals: Map<string, number>,
    grid: Map<string, Map<string, number>>,
  ): { series: ActivitySeries[]; colors: string[] } {
    const ranked = [...secondaryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, MAX_STACK_SERIES).map(([key]) => key);
    const overflow = ranked.slice(MAX_STACK_SERIES).map(([key]) => key);

    const series: ActivitySeries[] = top.map((key) => ({
      name: key,
      data: categoryKeys.map((categoryKey) => grid.get(key)?.get(categoryKey) ?? 0),
    }));
    const colors = top.map((_, index) => CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]);

    if (overflow.length > 0) {
      series.push({
        name: OTHER_LABEL,
        data: categoryKeys.map((categoryKey) =>
          overflow.reduce((sum, key) => sum + (grid.get(key)?.get(categoryKey) ?? 0), 0),
        ),
      });
      colors.push(OTHER_COLOR);
    }

    return { series, colors };
  }

  private readonly activityStack = computed(() => {
    const granularity = granularityFor(this.dateRangeKey());
    const bucketOrder: string[] = [];
    const bucketLabels = new Map<string, string>();
    const authorTotals = new Map<string, number>();
    const grid = new Map<string, Map<string, number>>();

    for (const commit of this.filteredCommits()) {
      const { key: bucketKey, label } = bucketFor(new Date(commit.committedAt), granularity);
      if (!bucketLabels.has(bucketKey)) {
        bucketLabels.set(bucketKey, label);
        bucketOrder.push(bucketKey);
      }

      const author = commit.authorLogin ?? 'Unknown';
      authorTotals.set(author, (authorTotals.get(author) ?? 0) + 1);
      if (!grid.has(author)) {
        grid.set(author, new Map());
      }
      const authorGrid = grid.get(author) as Map<string, number>;
      authorGrid.set(bucketKey, (authorGrid.get(bucketKey) ?? 0) + 1);
    }

    bucketOrder.sort();
    const categories = bucketOrder.map((key) => bucketLabels.get(key) as string);
    const { series, colors } = this.buildStackedSeries(bucketOrder, authorTotals, grid);
    return { categories, series, colors };
  });

  private readonly repoStack = computed(() => {
    const repos = this.contributionsByRepo();
    const repoIds = new Set(repos.map((repo) => repo.repoId));
    const categories = repos.map((repo) => repo.repoFullName);

    const authorTotals = new Map<string, number>();
    const grid = new Map<string, Map<string, number>>();

    for (const commit of this.filteredCommits()) {
      if (!repoIds.has(commit.repoId)) continue;
      const author = commit.authorLogin ?? 'Unknown';
      authorTotals.set(author, (authorTotals.get(author) ?? 0) + 1);
      if (!grid.has(author)) {
        grid.set(author, new Map());
      }
      const authorGrid = grid.get(author) as Map<string, number>;
      authorGrid.set(commit.repoId, (authorGrid.get(commit.repoId) ?? 0) + 1);
    }

    const { series, colors } = this.buildStackedSeries(
      repos.map((repo) => repo.repoId),
      authorTotals,
      grid,
    );
    return { categories, series, colors };
  });

  private readonly contributorStack = computed(() => {
    const contributors = this.topContributors();
    const authorNames = new Set(contributors.map((contributor) => contributor.author));
    const categories = contributors.map((contributor) => contributor.author);

    const repoTotals = new Map<string, number>();
    const grid = new Map<string, Map<string, number>>();

    for (const commit of this.filteredCommits()) {
      const author = commit.authorLogin ?? 'Unknown';
      if (!authorNames.has(author)) continue;
      repoTotals.set(commit.repoFullName, (repoTotals.get(commit.repoFullName) ?? 0) + 1);
      if (!grid.has(commit.repoFullName)) {
        grid.set(commit.repoFullName, new Map());
      }
      const repoGrid = grid.get(commit.repoFullName) as Map<string, number>;
      repoGrid.set(author, (repoGrid.get(author) ?? 0) + 1);
    }

    const { series, colors } = this.buildStackedSeries(
      contributors.map((contributor) => contributor.author),
      repoTotals,
      grid,
    );
    return { categories, series, colors };
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

  protected readonly activityChartSeries = computed<ApexAxisChartSeries>(
    () => this.activityStack().series,
  );
  protected readonly activityChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.activityStack().categories,
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
    crosshairs: { show: false },
  }));
  protected readonly activityChartColors = computed<string[]>(
    () => this.activityStack().colors,
  );
  protected readonly activityChart: ApexChart = {
    ...BASE_CHART,
    type: 'bar',
    height: 280,
    stacked: true,
  };
  protected readonly activityPlotOptions = {
    bar: { borderRadius: 4, borderRadiusApplication: 'end' as const, columnWidth: '55%' },
  };
  protected readonly stackedLegend = {
    show: true,
    // Without this, ApexCharts hides the legend entirely for a single-series
    // chart, which frees up extra vertical space and makes that chart's bars
    // render thicker than an otherwise-identical multi-series chart at the
    // same height. Forcing it on (and to a fixed height) keeps every stacked
    // chart's legend footprint - and therefore its bar thickness - constant.
    showForSingleSeries: true,
    height: 30,
    position: 'bottom' as const,
    fontSize: '11px',
    labels: { colors: CHART_FORE_COLOR },
    markers: { size: 6 },
  };

  protected readonly repoChartSeries = computed<ApexAxisChartSeries>(
    () => this.repoStack().series,
  );
  protected readonly repoChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.repoStack().categories,
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  protected readonly repoChartColors = computed<string[]>(() => this.repoStack().colors);
  protected readonly repoChart = computed<ApexChart>(() => ({
    ...BASE_CHART,
    type: 'bar',
    height: this.contributionsByRepo().length * BAR_ROW_HEIGHT + BAR_CHART_CHROME,
    stacked: true,
    events: {
      dataPointSelection: (_event, _chart, options) => {
        const repo = this.contributionsByRepo()[options?.dataPointIndex ?? -1];
        if (repo) {
          this.router.navigate(['/repos', repo.repoId]);
        }
      },
    },
  }));

  protected readonly contributorChartSeries = computed<ApexAxisChartSeries>(
    () => this.contributorStack().series,
  );
  protected readonly contributorChartXaxis = computed<ApexXAxis>(() => ({
    categories: this.contributorStack().categories,
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  protected readonly contributorChartColors = computed<string[]>(
    () => this.contributorStack().colors,
  );
  protected readonly contributorChart = computed<ApexChart>(() => ({
    ...BASE_CHART,
    type: 'bar',
    height: this.topContributors().length * BAR_ROW_HEIGHT + BAR_CHART_CHROME,
    stacked: true,
  }));

  protected readonly horizontalPlotOptions = {
    bar: {
      horizontal: true,
      borderRadius: 4,
      borderRadiusApplication: 'end' as const,
      barHeight: '55%',
    },
  };
  protected readonly noDataLabels = { enabled: false };
  protected readonly chartGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 3 };
  protected readonly stackedTooltip = { theme: 'dark' as const, shared: true, intersect: false };

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
