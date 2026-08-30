import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChartComponent, type ApexAxisChartSeries, type ApexChart, type ApexXAxis } from 'ng-apexcharts';
import type { ApexTooltipCustomOpts } from 'apexcharts';
import { Skeleton } from '@org/ui';
import type {
  ActivitySeries,
  ContributorStat,
  DateRangeKey,
  RepoCommitWithContext,
  RepoContribution,
} from '@org/types';
import { bucketFor, extractErrorMessage, granularityFor, localDateKey } from '@org/helpers';
import {
  ACCENT_COLOR,
  CATEGORICAL_COLORS,
  CHART_FORE_COLOR,
  CHART_GRID_COLOR,
  CHART_LABEL_COLOR,
  DATE_RANGE_OPTIONS,
  OTHER_COLOR,
  OTHER_LABEL,
  RANGE_DAYS,
} from '../../common/data';
import { ReposService } from '../../core/services/repos.service';

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

// Indexed Sun=0..Sat=6.
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// GitHub's own calendar only labels every other weekday to avoid crowding the
// axis. This has to go through yaxis.labels.formatter rather than just
// blanking the unwanted series names: ApexCharts auto-thins heatmap row
// labels to whatever fits the chart's pixel height, by array position, and
// that thinning would just as easily strip out Mon/Wed/Fri as the blanks
// depending on how many rows fit - a user-supplied formatter is the
// documented way to opt out of that auto-thinning entirely.
const VISIBLE_WEEKDAYS = new Set(['Mon', 'Wed', 'Fri']);
// ApexCharts' heatmap renders series bottom-up (the last array entry ends up
// on top), the opposite of the Sun-first order the calendar is built in. This
// reverses the row order fed to the chart so Sunday still lands on top.
const ROW_ORDER = [6, 5, 4, 3, 2, 1, 0];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// Fixed row height for the calendar heatmap (always 7 weekday rows) plus
// room for the sparse month labels along the top - unlike the other bar
// charts, this doesn't scale with row count since rows are always 7.
const CALENDAR_ROW_HEIGHT = 20;
const CALENDAR_CHART_CHROME = 30;
// ACCENT_COLOR (#3987e5) as an r,g,b triple, for the heatmap's alpha-graduated color scale.
const ACCENT_RGB = '57, 135, 229';
// The 5-step "Less -> More" scale, shared by the heatmap's colorScale ranges
// and its legend swatches so the two can never drift out of sync.
const HEATMAP_LEVEL_COLORS = [
  CHART_GRID_COLOR,
  `rgba(${ACCENT_RGB}, 0.35)`,
  `rgba(${ACCENT_RGB}, 0.6)`,
  `rgba(${ACCENT_RGB}, 0.8)`,
  ACCENT_COLOR,
];
// Matches the page background (bg-gray-950), a shade darker than
// CHART_GRID_COLOR above. Using the same color for both the "no activity"
// cell fill and the gap between cells made every empty cell blend into one
// solid mass with no visible boundary - this keeps the gap visibly darker.
const HEATMAP_GAP_COLOR = '#030712';

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

  protected readonly activityView = signal<'bar' | 'heatmap'>('bar');

  protected setActivityView(view: 'bar' | 'heatmap'): void {
    this.activityView.set(view);
  }

  /**
   * A GitHub-style contribution calendar: 7 weekday rows x one column per
   * week, spanning the selected date-range filter. Weeks are padded out to
   * full Sun-Sat columns so the grid lines up, with padding days outside the
   * actual range simply left at 0 (visually identical to a real 0-commit day).
   */
  private readonly activityCalendar = computed(() => {
    const dayCounts = new Map<string, number>();
    for (const commit of this.filteredCommits()) {
      const key = localDateKey(new Date(commit.committedAt));
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - RANGE_DAYS[this.dateRangeKey()] + 1);

    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const totalDays = Math.round((end.getTime() - gridStart.getTime()) / 86_400_000) + 1;
    const weekCount = Math.ceil(totalDays / 7);

    const counts: number[][] = Array.from({ length: 7 }, () => new Array(weekCount).fill(0));
    const dates: string[][] = Array.from({ length: 7 }, () => new Array(weekCount).fill(''));
    const weekLabels: string[] = new Array(weekCount).fill('');

    const cursor = new Date(gridStart);
    let lastMonth = -1;
    for (let week = 0; week < weekCount; week++) {
      for (let day = 0; day < 7; day++) {
        if (cursor >= start && cursor <= end) {
          const key = localDateKey(cursor);
          counts[day][week] = dayCounts.get(key) ?? 0;
          dates[day][week] = key;
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
  // Every other chart on this page styles its xaxis labels explicitly; the
  // heatmap's row labels (Sun/Mon/... on the y-axis) need the same treatment,
  // otherwise they fall back to ApexCharts' default label color, which is
  // invisible against this dark theme. The formatter (see VISIBLE_WEEKDAYS
  // above) is what actually keeps Mon/Wed/Fri showing regardless of height.
  protected readonly activityHeatmapYaxis = {
    labels: {
      show: true,
      style: AXIS_LABEL_STYLE,
      // ApexCharts' types declare this formatter as (val: number) => string,
      // modeling the common numeric-yaxis case. For a heatmap the y-axis is
      // categorical and ApexCharts actually calls this with the row's
      // category string (e.g. 'Mon') at runtime - the cast bridges that gap
      // in the type declarations rather than a real type mismatch.
      formatter: (val: number) => {
        const label = val as unknown as string;
        return VISIBLE_WEEKDAYS.has(label) ? label : '';
      },
    },
  };
  protected readonly activityHeatmapChart: ApexChart = {
    ...BASE_CHART,
    type: 'heatmap',
    height: 7 * CALENDAR_ROW_HEIGHT + CALENDAR_CHART_CHROME,
    animations: { enabled: false },
  };
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
  protected readonly activityHeatmapColors = [ACCENT_COLOR];
  // Matches the page background - deliberately darker than the "no activity"
  // cell fill (HEATMAP_LEVEL_COLORS[0]) so the gap is visible between cells
  // even when neighboring cells both have zero activity.
  protected readonly activityHeatmapStroke = { show: true, colors: [HEATMAP_GAP_COLOR], width: 4 };
  // Default heatmap hover state lightens the cell (toward white), which reads
  // as a stray flash against this dark theme - the tooltip already surfaces
  // the value on hover, so the highlight itself is turned off.
  protected readonly activityHeatmapStates = { hover: { filter: { type: 'none' as const } } };
  protected readonly activityHeatmapLegend = HEATMAP_LEVEL_COLORS;
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
        const contributionLabel = `${value} contribution${value === 1 ? '' : 's'}`;
        return `<div class="px-2 py-1.5 text-xs">${contributionLabel}${dateLabel ? ` on ${dateLabel}` : ''}</div>`;
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

  protected readonly horizontalPlotOptions = {
    bar: {
      horizontal: true,
      borderRadius: 4,
      borderRadiusApplication: 'end' as const,
      barHeight: '55%',
    },
  };
  protected readonly noDataLabels = { enabled: false };
  protected readonly insideBarDataLabels = {
    enabled: true,
    style: { fontSize: '11px', colors: ['#fff'] },
    dropShadow: { enabled: false },
  };
  protected readonly chartGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 3 };
  protected readonly stackedTooltip = { theme: 'dark' as const, shared: true, intersect: false };
  protected readonly noTooltip = { enabled: false };

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
