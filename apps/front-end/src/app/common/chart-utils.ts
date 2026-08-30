import type { ActivitySeries } from '@org/types';
import { CATEGORICAL_COLORS, OTHER_COLOR, OTHER_LABEL } from './data';
import { MAX_STACK_SERIES } from './chart-config';

/**
 * Ranks the secondary-dimension keys by total, caps at MAX_STACK_SERIES,
 * folds the rest into an "Other" series, and assigns the validated
 * categorical color order. Shared by every stacked chart across the app
 * (dashboard's activity/repo/contributor charts, repo-detail's activity chart).
 */
export function buildStackedSeries(
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
