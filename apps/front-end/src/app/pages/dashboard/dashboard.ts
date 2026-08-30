import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChartComponent, type ApexAxisChartSeries, type ApexChart, type ApexXAxis } from 'ng-apexcharts';
import type { ApexTooltipCustomOpts } from 'apexcharts';
import { ButtonGroup, Select, Skeleton, type ButtonGroupOption, type SelectOption } from '@org/ui';
import type {
  ActivitySeries,
  ContributorStat,
  DateRangeKey,
  RepoCommitWithContext,
  RepoContribution,
} from '@org/types';
import { bucketFor, extractErrorMessage, granularityFor, localDateKey } from '@org/helpers';
import { CATEGORICAL_COLORS, DATE_RANGE_OPTIONS, OTHER_COLOR, OTHER_LABEL, RANGE_DAYS } from '../../common/data';
import {
  ACTIVITY_CHART,
  ACTIVITY_HEATMAP_CHART,
  ACTIVITY_HEATMAP_COLORS,
  ACTIVITY_HEATMAP_STATES,
  ACTIVITY_HEATMAP_STROKE,
  ACTIVITY_HEATMAP_YAXIS,
  ACTIVITY_PLOT_OPTIONS,
  AXIS_LABEL_STYLE,
  BAR_CHART_CHROME,
  BAR_ROW_HEIGHT,
  BASE_CHART,
  CHART_GRID,
  DISABLED_VALUE,
  HEATMAP_DISABLED_COLOR,
  HEATMAP_LEVEL_COLORS,
  HORIZONTAL_PLOT_OPTIONS,
  INSIDE_BAR_DATA_LABELS,
  MAX_STACK_SERIES,
  MONTH_LABELS,
  NO_DATA_LABELS,
  NO_TOOLTIP,
  ROW_ORDER,
  STACKED_LEGEND,
  STACKED_TOOLTIP,
  WEEKDAY_LABELS,
  YEAR_DAYS,
} from '../../common/chart-config';
import { ReposService } from '../../core/services/repos.service';

const UNKNOWN_AUTHOR = '__unknown__';
const TOP_REPO_COUNT = 8;
const TOP_CONTRIBUTOR_COUNT = 6;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Skeleton, ChartComponent, ButtonGroup, Select],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  // ---------------------------------------------------------------------
  // Readonly variables
  // ---------------------------------------------------------------------

  private readonly reposService = inject(ReposService);
  private readonly router = inject(Router);

  protected readonly dateRangeSelectOptions: SelectOption[] = DATE_RANGE_OPTIONS.map(
    (option) => ({ value: option.key, label: option.label }),
  );
  protected readonly dateRangeKey = signal<DateRangeKey>('30d');
  protected readonly selectedRepoId = signal<string>('all');
  protected readonly selectedAuthor = signal<string>('all');
  protected readonly activityView = signal<'bar' | 'heatmap'>('bar');
  protected readonly activityViewOptions: ButtonGroupOption[] = [
    { value: 'bar', label: 'Bars' },
    { value: 'heatmap', label: 'Heatmap' },
  ];

  private readonly reposResource = this.reposService.trackedRepos();
  private readonly commitsResource = this.reposService.contributionActivity(
    () => this.since(),
  );
  protected readonly repos = this.reposResource.value;

  protected readonly activityChart = ACTIVITY_CHART;
  protected readonly activityPlotOptions = ACTIVITY_PLOT_OPTIONS;
  protected readonly stackedLegend = STACKED_LEGEND;

  protected readonly activityHeatmapYaxis = ACTIVITY_HEATMAP_YAXIS;
  protected readonly activityHeatmapChart = ACTIVITY_HEATMAP_CHART;
  protected readonly activityHeatmapColors = ACTIVITY_HEATMAP_COLORS;
  protected readonly activityHeatmapStroke = ACTIVITY_HEATMAP_STROKE;
  protected readonly activityHeatmapStates = ACTIVITY_HEATMAP_STATES;
  protected readonly activityHeatmapLegend = HEATMAP_LEVEL_COLORS;

  protected readonly horizontalPlotOptions = HORIZONTAL_PLOT_OPTIONS;
  protected readonly noDataLabels = NO_DATA_LABELS;
  protected readonly insideBarDataLabels = INSIDE_BAR_DATA_LABELS;
  protected readonly chartGrid = CHART_GRID;
  protected readonly stackedTooltip = STACKED_TOOLTIP;
  protected readonly noTooltip = NO_TOOLTIP;

  // ---------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------

  private readonly since = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() - RANGE_DAYS[this.dateRangeKey()]);
    // Date-only, not a full datetime: GitHub's API accepts either, and this
    // keeps the value stable to the day instead of down to the millisecond -
    // otherwise every remount of this component (e.g. navigating away and
    // back) produces a new `since` from `new Date()`, busting the response
    // cache even when the date-range filter hasn't actually changed.
    return date.toISOString().slice(0, 10);
  });

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

  protected readonly repoFilterOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: 'All repositories' },
    ...this.repos().map((repo) => ({ value: repo.id, label: repo.fullName })),
  ]);

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

  protected readonly contributorFilterOptions = computed<SelectOption[]>(() => {
    const { logins, hasUnknown } = this.contributorOptions();
    const options: SelectOption[] = [
      { value: 'all', label: 'All contributors' },
      ...logins.map((login) => ({ value: login, label: login })),
    ];
    if (hasUnknown) {
      options.push({ value: UNKNOWN_AUTHOR, label: 'Unknown' });
    }
    return options;
  });

  protected readonly filteredCommits = computed<RepoCommitWithContext[]>(() => {
    const list = this.repoFilteredCommits();
    const author = this.selectedAuthor();
    if (author === 'all') return list;
    if (author === UNKNOWN_AUTHOR) return list.filter((commit) => !commit.authorLogin);
    return list.filter((commit) => commit.authorLogin === author);
  });

  protected readonly totalContributions = computed(() => this.filteredCommits().length);

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

  /**
   * A GitHub-style contribution calendar: 7 weekday rows x one column per
   * week, always spanning a full year regardless of the selected date-range
   * filter, so the grid's shape stays constant. Days outside the selected
   * filter (and any not-yet-happened days padding out the final week) are
   * marked DISABLED_VALUE instead of a real count, so they render as a
   * distinct dimmed state rather than looking like a real 0-commit day.
   */
  private readonly activityCalendar = computed(() => {
    const dayCounts = new Map<string, number>();
    for (const commit of this.filteredCommits()) {
      const key = localDateKey(new Date(commit.committedAt));
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const rangeStart = new Date(end);
    rangeStart.setDate(rangeStart.getDate() - RANGE_DAYS[this.dateRangeKey()] + 1);

    const yearStart = new Date(end);
    yearStart.setDate(yearStart.getDate() - YEAR_DAYS + 1);

    const gridStart = new Date(yearStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const totalDays = Math.round((end.getTime() - gridStart.getTime()) / 86_400_000) + 1;
    const weekCount = Math.ceil(totalDays / 7);

    const counts: number[][] = Array.from({ length: 7 }, () =>
      new Array(weekCount).fill(DISABLED_VALUE),
    );
    const dates: string[][] = Array.from({ length: 7 }, () => new Array(weekCount).fill(''));
    const weekLabels: string[] = new Array(weekCount).fill('');

    const cursor = new Date(gridStart);
    let lastMonth = -1;
    for (let week = 0; week < weekCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (cursor <= end) {
          const key = localDateKey(cursor);
          dates[day][week] = key;
          counts[day][week] = cursor >= rangeStart ? (dayCounts.get(key) ?? 0) : DISABLED_VALUE;
        }
        if (day === 0 && cursor.getMonth() !== lastMonth) {
          weekLabels[week] = MONTH_LABELS[cursor.getMonth()];
          lastMonth = cursor.getMonth();
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const series = ROW_ORDER.map((day) => ({ name: WEEKDAY_LABELS[day], data: counts[day] }));
    const orderedDates = ROW_ORDER.map((day) => dates[day]);
    return { series, categories: weekLabels, dates: orderedDates };
  });

  protected readonly activityHeatmapSeries = computed<ApexAxisChartSeries>(
    () => this.activityCalendar().series,
  );
  protected readonly activityHeatmapXaxis = computed<ApexXAxis>(() => ({
    categories: this.activityCalendar().categories,
    labels: { style: AXIS_LABEL_STYLE },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));
  // ApexCharts' default heatmap shading lightens the base color toward white
  // for low values, which reads as a stray pale/white box on this dark theme.
  // Explicit ranges pin the zero-activity color to the card's own grid color
  // instead, then ramp accent-color opacity up through the rest of the scale.
  // `enableShades: false` is required too - it defaults to true and otherwise
  // re-lightens even these explicit range colors based on value position.
  protected readonly activityHeatmapPlotOptions = computed(() => {
    const values = this.activityCalendar().series.flatMap((series) => series.data);
    const max = Math.max(0, ...values);
    const step = Math.max(1, Math.ceil(max / 4));
    return {
      heatmap: {
        radius: 4,
        enableShades: false,
        colorScale: {
          ranges: [
            {
              from: DISABLED_VALUE,
              to: DISABLED_VALUE,
              color: HEATMAP_DISABLED_COLOR,
              name: 'Outside selected range',
            },
            { from: 0, to: 0, color: HEATMAP_LEVEL_COLORS[0], name: 'No activity' },
            { from: 1, to: step, color: HEATMAP_LEVEL_COLORS[1], name: 'Low' },
            { from: step + 1, to: step * 2, color: HEATMAP_LEVEL_COLORS[2], name: 'Medium' },
            { from: step * 2 + 1, to: step * 3, color: HEATMAP_LEVEL_COLORS[3], name: 'High' },
            { from: step * 3 + 1, to: Math.max(max, step * 4), color: HEATMAP_LEVEL_COLORS[4], name: 'Very high' },
          ],
        },
      },
    };
  });
  protected readonly activityHeatmapTooltip = computed(() => {
    const { dates } = this.activityCalendar();
    return {
      theme: 'dark' as const,
      custom: ({ series, seriesIndex, dataPointIndex }: ApexTooltipCustomOpts) => {
        const value = series[seriesIndex][dataPointIndex];
        const iso = dates[seriesIndex][dataPointIndex];
        const dateLabel = iso
          ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '';
        const body =
          value === DISABLED_VALUE
            ? `Outside the selected range${dateLabel ? ` (${dateLabel})` : ''}`
            : `${value} contribution${value === 1 ? '' : 's'}${dateLabel ? ` on ${dateLabel}` : ''}`;
        return `<div class="px-2 py-1.5 text-xs">${body}</div>`;
      },
    };
  });

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

  // ---------------------------------------------------------------------
  // Private functions
  // ---------------------------------------------------------------------

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

  protected setActivityView(view: 'bar' | 'heatmap'): void {
    this.activityView.set(view);
  }

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
