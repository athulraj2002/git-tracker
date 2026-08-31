import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  model,
  signal,
  viewChild,
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

// `date` is null for a blank leading/trailing cell - this calendar only
// ever shows days that belong to the month it's titled after, never a
// neighboring month's dates, so those cells render empty instead.
interface CalendarCell {
  date: Date | null;
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

// Only this month's own days - leading/trailing cells before day 1 and
// after the last day are blank (`date: null`), never another month's date.
// The grid still pads out to a whole number of weeks so every row has 7
// cells, but never adds a 6th row just to carry more blanks.
function buildMonthGrid(month: Date): CalendarCell[] {
  const leadingBlanks = mondayIndex(startOfMonth(month));
  const daysInMonth = endOfMonth(month).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ date: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(month.getFullYear(), month.getMonth(), day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null });
  }
  return cells;
}

// Pads a grid with trailing blank rows so both calendars in the panel are
// the same height even when their months span a different number of weeks -
// otherwise the two would end at different heights, since a blank cell
// never borrows a neighboring month's date to fill the gap.
function padToRows(cells: CalendarCell[], rows: number): CalendarCell[] {
  const target = rows * 7;
  if (cells.length >= target) return cells;
  return [...cells, ...Array.from({ length: target - cells.length }, () => ({ date: null }))];
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
 * right, always shown side by side (no single-calendar mode). Each calendar
 * only ever shows its own month's days - no neighboring-month dates fill
 * the leading/trailing gaps, those cells are left blank. Picking a custom
 * range is click-start, then click-end in either calendar - the second
 * click can land before the first, and the range is normalized so `start`
 * is always the earlier date. The picker is date-only throughout - there's
 * no time-of-day to set, and `value` never carries one (see `DateRange`).
 */
@Component({
  selector: 'lib-ui-date-range-picker',
  templateUrl: './date-range-picker.html',
})
export class DateRangePicker {
  readonly value = model.required<DateRange>();

  protected readonly isOpen = signal(false);
  protected readonly leftMonth = signal(startOfMonth(new Date()));
  // Independently navigable, not just leftMonth + 1 - each calendar has its
  // own prev/next arrows (see nextLeftMonth/previousRightMonth), so the two
  // can drift further apart than one month. They can never become the same
  // month or cross over, enforced by disabling the inward-facing arrow once
  // they're adjacent (see isAdjacent).
  protected readonly rightMonth = signal(addMonths(new Date(), 1));
  // Set while the user is picking a custom range: the first click landed
  // here and we're waiting for the second. Null the rest of the time.
  protected readonly pendingStart = signal<Date | null>(null);
  protected readonly hoverDate = signal<Date | null>(null);
  // Which edge the panel is anchored to - recomputed on open (see
  // togglePanel) from the trigger's actual position, since anchoring to a
  // fixed side overflows the viewport whenever the trigger sits close to
  // that edge (a right-anchored panel clips left-of-screen triggers, a
  // left-anchored one clips right-of-screen triggers).
  protected readonly alignRight = signal(false);
  protected readonly dayLabels = DAY_LABELS;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly today = startOfDay(new Date());
  protected readonly presets = buildPresets(this.today);

  protected readonly leftMonthLabel = computed(() => this.formatMonth(this.leftMonth()));
  protected readonly rightMonthLabel = computed(() => this.formatMonth(this.rightMonth()));
  // True once the two calendars are exactly one month apart - the inward
  // arrows (left's next, right's prev) are disabled in this state, since
  // moving either would make the two calendars show the same month.
  protected readonly isAdjacent = computed(() => {
    const left = this.leftMonth();
    const right = this.rightMonth();
    const monthsApart =
      (right.getFullYear() - left.getFullYear()) * 12 + (right.getMonth() - left.getMonth());
    return monthsApart <= 1;
  });
  private readonly rawLeftDays = computed(() => buildMonthGrid(this.leftMonth()));
  private readonly rawRightDays = computed(() => buildMonthGrid(this.rightMonth()));
  private readonly rowCount = computed(() =>
    Math.max(this.rawLeftDays().length, this.rawRightDays().length) / 7,
  );
  protected readonly leftDays = computed(() => padToRows(this.rawLeftDays(), this.rowCount()));
  protected readonly rightDays = computed(() => padToRows(this.rawRightDays(), this.rowCount()));
  // The committed `value`, parsed back into Dates for calendar math/display.
  private readonly valueAsDates = computed<InternalRange>(() => ({
    start: fromDateKey(this.value().start),
    end: fromDateKey(this.value().end),
  }));
  protected readonly activePresetLabel = computed(() => {
    const current = this.value();
    const match = this.presets.find((preset) => {
      const range = preset.range();
      return toDateKey(range.start) === current.start && toDateKey(range.end) === current.end;
    });
    return match?.label ?? null;
  });
  // Show the preset's own name ("Last month") when the value exactly
  // matches one, since that reads better than its expanded date span - fall
  // back to the actual range once it's a custom selection that doesn't
  // correspond to any preset.
  protected readonly triggerLabel = computed(
    () => this.activePresetLabel() ?? this.formatRange(this.valueAsDates()),
  );
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
    const anchor = startOfMonth(this.valueAsDates().start);
    this.leftMonth.set(anchor);
    this.rightMonth.set(addMonths(anchor, 1));
    this.pendingStart.set(null);
    this.hoverDate.set(null);
    this.isOpen.set(true);
    // The panel doesn't exist in the DOM until this render commits - measure
    // its actual width once the browser has laid it out (rAF fires after
    // paint) rather than guessing a fixed width up front.
    requestAnimationFrame(() => this.positionPanel());
  }

  protected selectPreset(preset: Preset): void {
    const range = preset.range();
    this.value.set({ start: toDateKey(range.start), end: toDateKey(range.end) });
    const anchor = startOfMonth(range.start);
    this.leftMonth.set(anchor);
    this.rightMonth.set(addMonths(anchor, 1));
    this.pendingStart.set(null);
    this.hoverDate.set(null);
  }

  protected selectDay(day: CalendarCell): void {
    if (!day.date) return;
    const clicked = day.date;
    const start = this.pendingStart();
    if (!start) {
      this.pendingStart.set(clicked);
      return;
    }
    const range = clicked < start ? { start: clicked, end: start } : { start, end: clicked };
    this.value.set({ start: toDateKey(range.start), end: toDateKey(range.end) });
    this.pendingStart.set(null);
    this.hoverDate.set(null);
  }

  protected hoverDay(day: CalendarCell): void {
    if (day.date && this.pendingStart()) {
      this.hoverDate.set(day.date);
    }
  }

  protected previousLeftMonth(): void {
    this.leftMonth.update((month) => addMonths(month, -1));
  }

  protected nextLeftMonth(): void {
    if (this.isAdjacent()) return;
    this.leftMonth.update((month) => addMonths(month, 1));
  }

  protected previousRightMonth(): void {
    if (this.isAdjacent()) return;
    this.rightMonth.update((month) => addMonths(month, -1));
  }

  protected nextRightMonth(): void {
    this.rightMonth.update((month) => addMonths(month, 1));
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

  private positionPanel(): void {
    const panelEl = this.panelRef()?.nativeElement;
    if (!panelEl) return;
    const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
    const panelWidth = panelEl.getBoundingClientRect().width;
    // Anchoring to the left (the default) overflows the viewport if the
    // panel would extend past the right edge from here; anchoring right
    // instead would overflow the left edge if the trigger can't fit the
    // panel on either side without clipping, prefer left (matches the
    // window's own horizontal scrollbar direction).
    const overflowsRight = hostRect.left + panelWidth > window.innerWidth;
    const fitsOnRight = hostRect.right - panelWidth >= 0;
    this.alignRight.set(overflowsRight && fitsOnRight);
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
