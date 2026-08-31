import { toDateKey, type DateRange } from '@org/ui';

export const ACCENT_COLOR = '#3987e5';

/**
 * The current calendar month (1st through last day), for a date-range
 * picker's initial value - matches the picker's own "This month" preset
 * exactly, so the trigger shows that label rather than an expanded range.
 */
export function defaultDateRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

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
