import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ChartComponent, type ApexAxisChartSeries, type ApexChart, type ApexXAxis } from 'ng-apexcharts';
import { Button, Dialog, Select, Skeleton, type SelectOption } from '@org/ui';
import type { ContributorStat, DateRangeKey } from '@org/types';
import { bucketFor, extractErrorMessage } from '@org/helpers';
import { ACCENT_COLOR, DATE_RANGE_OPTIONS, RANGE_DAYS } from '../../common/data';
import {
  ACTIVITY_CHART,
  ACTIVITY_PLOT_OPTIONS,
  AXIS_LABEL_STYLE,
  BAR_CHART_CHROME,
  BAR_ROW_HEIGHT,
  BASE_CHART,
  CHART_GRID,
  HORIZONTAL_PLOT_OPTIONS,
  INSIDE_BAR_DATA_LABELS,
  NO_DATA_LABELS,
  NO_TOOLTIP,
  STACKED_LEGEND,
  STACKED_TOOLTIP,
} from '../../common/chart-config';
import { buildStackedSeries } from '../../common/chart-utils';
import { ReposService } from '../../core/services/repos.service';

const TOP_CONTRIBUTOR_COUNT = 6;

@Component({
  selector: 'app-repo-detail',
  imports: [RouterLink, DatePipe, Skeleton, ChartComponent, Select, Dialog, Button],
  templateUrl: './repo-detail.html',
})
export class RepoDetail {
  // ---------------------------------------------------------------------
  // Readonly variables
  // ---------------------------------------------------------------------

  protected readonly accentColor = ACCENT_COLOR;
  protected readonly dateRangeSelectOptions: SelectOption[] = DATE_RANGE_OPTIONS.map(
    (option) => ({ value: option.key, label: option.label }),
  );
  protected readonly dateRangeKey = signal<DateRangeKey>('30d');
  protected readonly isSettingsOpen = signal(false);
  protected readonly isInfoOpen = signal(false);
  protected readonly isTracking = signal(false);
  protected readonly trackErrorMessage = signal('');
  protected readonly isUntracking = signal(false);
  protected readonly untrackErrorMessage = signal('');

  private readonly reposService = inject(ReposService);
  private readonly router = inject(Router);

  readonly id = input<string>();

  private readonly detailResource = this.reposService.repoDetail(this.id);
  private readonly commitsResource = this.reposService.repoCommits(
    this.id,
    () => this.since(),
  );
  protected readonly commits = this.commitsResource.value;

  protected readonly contributorChartColors = [ACCENT_COLOR];
  protected readonly horizontalPlotOptions = HORIZONTAL_PLOT_OPTIONS;
  protected readonly insideBarDataLabels = INSIDE_BAR_DATA_LABELS;
  protected readonly chartGrid = CHART_GRID;
  protected readonly noTooltip = NO_TOOLTIP;

  protected readonly activityChart = ACTIVITY_CHART;
  protected readonly activityPlotOptions = ACTIVITY_PLOT_OPTIONS;
  protected readonly noDataLabels = NO_DATA_LABELS;
  protected readonly stackedLegend = STACKED_LEGEND;
  protected readonly stackedTooltip = STACKED_TOOLTIP;

  // ---------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------

  private readonly since = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() - RANGE_DAYS[this.dateRangeKey()]);
    return date.toISOString().slice(0, 10);
  });

  protected readonly repo = computed(() => this.detailResource.value()?.repo ?? null);
  protected readonly isLoading = computed(() => {
    const status = this.detailResource.status();
    return status === 'loading' || status === 'idle';
  });
  protected readonly errorMessage = computed(() => {
    const error = this.detailResource.error();
    return error ? extractErrorMessage(error, 'Unable to load this repository.') : '';
  });

  protected readonly isCommitsLoading = computed(
    () => this.commitsResource.status() === 'loading',
  );
  protected readonly commitsErrorMessage = computed(() => {
    const error = this.commitsResource.error();
    return error ? extractErrorMessage(error, 'Unable to load commits.') : '';
  });

  protected readonly topContributors = computed<ContributorStat[]>(() => {
    const counts = new Map<string, number>();
    for (const commit of this.commits()) {
      const author = commit.authorLogin ?? 'Unknown';
      counts.set(author, (counts.get(author) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CONTRIBUTOR_COUNT)
      .map(([author, count]) => ({ author, count }));
  });

  protected readonly contributorChartSeries = computed<ApexAxisChartSeries>(() => [
    { name: 'Commits', data: this.topContributors().map((contributor) => contributor.count) },
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
    height: this.topContributors().length * BAR_ROW_HEIGHT + BAR_CHART_CHROME,
  }));

  /**
   * Daily commit activity for this repo, stacked by contributor. Unlike the
   * dashboard's activity chart, this always buckets by day regardless of the
   * selected range (no granularity switching), and there's no "by repo"
   * dimension to stack since the page is already scoped to one repo.
   */
  private readonly activityStack = computed(() => {
    const bucketOrder: string[] = [];
    const bucketLabels = new Map<string, string>();
    const authorTotals = new Map<string, number>();
    const grid = new Map<string, Map<string, number>>();

    for (const commit of this.commits()) {
      const { key: bucketKey, label } = bucketFor(new Date(commit.committedAt), 'day');
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
    const { series, colors } = buildStackedSeries(bucketOrder, authorTotals, grid);
    return { categories, series, colors };
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

  // ---------------------------------------------------------------------
  // Private functions
  // ---------------------------------------------------------------------

  protected setDateRange(key: string): void {
    this.dateRangeKey.set(key as DateRangeKey);
  }

  protected openSettings(): void {
    this.trackErrorMessage.set('');
    this.untrackErrorMessage.set('');
    this.isSettingsOpen.set(true);
  }

  protected openInfo(): void {
    this.isInfoOpen.set(true);
  }

  protected async trackRepo(): Promise<void> {
    const repoId = this.id();
    if (!repoId) return;

    this.isTracking.set(true);
    this.trackErrorMessage.set('');
    try {
      await this.reposService.trackRepo(repoId);
      this.detailResource.reload();
      this.isSettingsOpen.set(false);
    } catch (error) {
      this.trackErrorMessage.set(
        extractErrorMessage(error, 'Unable to track this repository.'),
      );
    } finally {
      this.isTracking.set(false);
    }
  }

  protected async untrackRepo(): Promise<void> {
    const repoId = this.id();
    if (!repoId) return;

    this.isUntracking.set(true);
    this.untrackErrorMessage.set('');
    try {
      await this.reposService.untrackRepo(repoId);
      await this.router.navigateByUrl('/repos');
    } catch (error) {
      this.untrackErrorMessage.set(
        extractErrorMessage(error, 'Unable to untrack this repository.'),
      );
    } finally {
      this.isUntracking.set(false);
    }
  }
}
