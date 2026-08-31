import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';

/**
 * A calendar date with no time-of-day component, as `YYYY-MM-DD`. Using a
 * plain string (rather than a `Date`, which always carries a time) means
 * this value can't accidentally pick up a time zone shift when it's
 * serialized or sent to an API - it can only ever represent a day.
 */
export interface DateRange {
  start: string;
  end: string;
}

interface CalendarDay {
  date: Date;
  inMonth: boolean;
}

// Internal-only: calendar math needs real Date objects, but every path out
// to `value` (the public DateRange) goes through toDateKey() first.
interface InternalRange {
  start: Date;
  end: Date;
}

interface Preset {
  label: string;
  range: () => InternalRange;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// Monday = 0 ... Sunday = 6, so the grid can start each week on Monday.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function startOfWeek(date: Date): Date {
  return addDays(date, -mondayIndex(date));
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Reads local Y/M/D directly rather than going through toISOString(), which
// converts to UTC first and can silently shift the date by a day in any
// timezone ahead of UTC.
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The inverse of toDateKey() - constructs the Date from local Y/M/D parts
// rather than `new Date(key)`, which parses as UTC midnight and would drift
// to the previous local day west of UTC... er, ahead of UTC.
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Always 42 cells (6 full Mon-Sun weeks) so the grid height never shifts
// between months, and leading/trailing days from adjacent months fill the
// gaps instead of leaving blanks.
function buildMonthGrid(month: Date): CalendarDay[] {
  const gridStart = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
}

function buildPresets(today: Date): Preset[] {
  const yesterday = addDays(today, -1);
  const thisWeekStart = startOfWeek(today);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(addMonths(today, -1));
  const lastMonthEnd = endOfMonth(addMonths(today, -1));
  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const thisYearEnd = new Date(today.getFullYear(), 11, 31);
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);

  return [
    { label: 'Today', range: () => ({ start: today, end: today }) },
    { label: 'Yesterday', range: () => ({ start: yesterday, end: yesterday }) },
    { label: 'This week', range: () => ({ start: thisWeekStart, end: thisWeekEnd }) },
    { label: 'Last week', range: () => ({ start: lastWeekStart, end: lastWeekEnd }) },
    { label: 'Past two weeks', range: () => ({ start: lastWeekStart, end: thisWeekEnd }) },
    { label: 'This month', range: () => ({ start: thisMonthStart, end: thisMonthEnd }) },
    { label: 'Last month', range: () => ({ start: lastMonthStart, end: lastMonthEnd }) },
    { label: 'This year', range: () => ({ start: thisYearStart, end: thisYearEnd }) },
    { label: 'Last year', range: () => ({ start: lastYearStart, end: lastYearEnd }) },
  ];
}

/**
 * A dual-calendar date-range picker: a trigger button that opens a panel
 * with quick-select presets on the left and two Mon-Sun month grids on the
 * right, always shown side by side (no single-calendar mode). Picking a
 * custom range is click-start, then click-end in either calendar - the
 * second click can land before the first, and the range is normalized so
 * `start` is always the earlier date. The picker is date-only throughout -
 * there's no time-of-day to set, and `value` never carries one (see
 * `DateRange`).
 */
@Component({
  selector: 'lib-ui-date-range-picker',
  templateUrl: './date-range-picker.html',
})
export class DateRangePicker {
  readonly value = model.required<DateRange>();

  protected readonly isOpen = signal(false);
  protected readonly leftMonth = signal(startOfMonth(new Date()));
  // Set while the user is picking a custom range: the first click landed
  // here and we're waiting for the second. Null the rest of the time.
  protected readonly pendingStart = signal<Date | null>(null);
  protected readonly hoverDate = signal<Date | null>(null);
  protected readonly dayLabels = DAY_LABELS;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly today = startOfDay(new Date());
  protected readonly presets = buildPresets(this.today);

  protected readonly rightMonth = computed(() => addMonths(this.leftMonth(), 1));
  protected readonly leftMonthLabel = computed(() => this.formatMonth(this.leftMonth()));
  protected readonly rightMonthLabel = computed(() => this.formatMonth(this.rightMonth()));
  protected readonly leftDays = computed(() => buildMonthGrid(this.leftMonth()));
  protected readonly rightDays = computed(() => buildMonthGrid(this.rightMonth()));
  // The committed `value`, parsed back into Dates for calendar math/display.
  private readonly valueAsDates = computed<InternalRange>(() => ({
    start: fromDateKey(this.value().start),
    end: fromDateKey(this.value().end),
  }));
  protected readonly triggerLabel = computed(() => this.formatRange(this.valueAsDates()));
  protected readonly activePresetLabel = computed(() => {
    const current = this.value();
    const match = this.presets.find((preset) => {
      const range = preset.range();
      return toDateKey(range.start) === current.start && toDateKey(range.end) === current.end;
    });
    return match?.label ?? null;
  });
  // What to actually paint as selected: the committed value normally, or a
  // live preview of {pendingStart, hoverDate} while picking a custom range.
  protected readonly displayRange = computed<InternalRange>(() => {
    const start = this.pendingStart();
    if (!start) {
      return this.valueAsDates();
    }
    const end = this.hoverDate() ?? start;
    return start <= end ? { start, end } : { start: end, end: start };
  });

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.isOpen.set(false);
  }

  protected togglePanel(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      return;
    }
    this.leftMonth.set(startOfMonth(this.valueAsDates().start));
    this.pendingStart.set(null);
    this.hoverDate.set(null);
    this.isOpen.set(true);
  }

  protected selectPreset(preset: Preset): void {
    const range = preset.range();
    this.value.set({ start: toDateKey(range.start), end: toDateKey(range.end) });
    this.leftMonth.set(startOfMonth(range.start));
    this.pendingStart.set(null);
    this.hoverDate.set(null);
  }

  protected selectDay(day: CalendarDay): void {
    const start = this.pendingStart();
    if (!start) {
      this.pendingStart.set(day.date);
      return;
    }
    const range = day.date < start ? { start: day.date, end: start } : { start, end: day.date };
    this.value.set({ start: toDateKey(range.start), end: toDateKey(range.end) });
    this.pendingStart.set(null);
    this.hoverDate.set(null);
  }

  protected hoverDay(day: CalendarDay): void {
    if (this.pendingStart()) {
      this.hoverDate.set(day.date);
    }
  }

  protected goToPreviousMonth(): void {
    this.leftMonth.update((month) => addMonths(month, -1));
  }

  protected goToNextMonth(): void {
    this.leftMonth.update((month) => addMonths(month, 1));
  }

  protected isRangeStart(date: Date): boolean {
    return sameDay(date, this.displayRange().start);
  }

  protected isRangeEnd(date: Date): boolean {
    return sameDay(date, this.displayRange().end);
  }

  protected isInRange(date: Date): boolean {
    const { start, end } = this.displayRange();
    return date > start && date < end;
  }

  protected isToday(date: Date): boolean {
    return sameDay(date, this.today);
  }

  private formatMonth(date: Date): string {
    return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
  }

  private formatRange(range: InternalRange): string {
    const startLabel = `${MONTH_LABELS[range.start.getMonth()]} ${range.start.getDate()}`;
    const endLabel = `${MONTH_LABELS[range.end.getMonth()]} ${range.end.getDate()}, ${range.end.getFullYear()}`;
    if (sameDay(range.start, range.end)) {
      return `${startLabel}, ${range.start.getFullYear()}`;
    }
    return `${startLabel} – ${endLabel}`;
  }
}
