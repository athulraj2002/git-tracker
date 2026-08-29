import type { DateRangeKey, DateRangeOption } from '@org/types';

export const ACCENT_COLOR = '#3987e5';

// Dark-mode categorical order validated for adjacent-pair use (stacks, bars, lines).
export const CATEGORICAL_COLORS = [
  ACCENT_COLOR,
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];
export const OTHER_COLOR = '#52525b';
export const OTHER_LABEL = 'Other';

export const CHART_FORE_COLOR = '#9ca3af';
export const CHART_LABEL_COLOR = '#6b7280';
export const CHART_GRID_COLOR = '#1f2937';

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '365d', label: 'Last 12 months' },
];

export const RANGE_DAYS: Record<DateRangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};
