export type Granularity = 'day' | 'week' | 'month';

/**
 * Picks a chart bucket size from the selected range's span in days, so an
 * arbitrary custom range (not just a fixed preset) still buckets sensibly -
 * a multi-year range in daily buckets would be unreadable, a 2-week range in
 * monthly buckets would be a single bar.
 */
export function granularityFor(spanDays: number): Granularity {
  if (spanDays > 180) return 'month';
  if (spanDays > 31) return 'week';
  return 'day';
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

export function bucketFor(
  date: Date,
  granularity: Granularity,
): { key: string; label: string } {
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

interface ErrorLike {
  error?: {
    message?: string | Array<string | { message: string }>;
  };
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!isErrorLike(error)) {
    return fallback;
  }

  const message = error.error?.message;
  if (Array.isArray(message)) {
    return message
      .map((issue) => (typeof issue === 'string' ? issue : issue.message))
      .join(' ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return fallback;
}

function isErrorLike(error: unknown): error is ErrorLike {
  return !!error && typeof error === 'object' && 'error' in error;
}
