import type { ApexChart } from 'ng-apexcharts';
import { ACCENT_COLOR, CHART_FORE_COLOR, CHART_GRID_COLOR, CHART_LABEL_COLOR } from './data';

// ---------------------------------------------------------------------------
// Shared across every chart on the dashboard
// ---------------------------------------------------------------------------

export const BASE_CHART: Partial<ApexChart> = {
  background: 'transparent',
  foreColor: CHART_FORE_COLOR,
  fontFamily: 'inherit',
  toolbar: { show: false },
};

export const AXIS_LABEL_STYLE = { colors: CHART_LABEL_COLOR, fontSize: '11px' };

// Caps how many series a stacked chart draws before folding the rest into
// an "Other" bucket, shared by activity/repo/contributor stacking.
export const MAX_STACK_SERIES = 7;

// ---------------------------------------------------------------------------
// Stacked bar charts (contribution activity, contributions-by-repo,
// top-contributors)
// ---------------------------------------------------------------------------

// Keeps horizontal bars a constant thickness regardless of how many rows
// there are, instead of stretching a single bar to fill a tall chart.
export const BAR_ROW_HEIGHT = 40;
// Measured against the rendered chart: legend (fixed 30px) + x-axis labels +
// the padding ApexCharts reserves around the plot area. Getting this wrong
// starves a single-row chart's one bar of nearly all its slot, since that
// deficit doesn't scale down with fewer rows the way BAR_ROW_HEIGHT does.
export const BAR_CHART_CHROME = 96;

export const ACTIVITY_CHART: ApexChart = {
  ...BASE_CHART,
  type: 'bar',
  height: 280,
  stacked: true,
};
export const ACTIVITY_PLOT_OPTIONS = {
  bar: { borderRadius: 4, borderRadiusApplication: 'end' as const, columnWidth: '55%' },
};
export const STACKED_LEGEND = {
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

export const HORIZONTAL_PLOT_OPTIONS = {
  bar: {
    horizontal: true,
    borderRadius: 4,
    borderRadiusApplication: 'end' as const,
    barHeight: '55%',
  },
};
export const NO_DATA_LABELS = { enabled: false };
export const INSIDE_BAR_DATA_LABELS = {
  enabled: true,
  style: { fontSize: '11px', colors: ['#fff'] },
  dropShadow: { enabled: false },
};
export const CHART_GRID = { borderColor: CHART_GRID_COLOR, strokeDashArray: 3 };
export const STACKED_TOOLTIP = { theme: 'dark' as const, shared: true, intersect: false };
export const NO_TOOLTIP = { enabled: false };

// ---------------------------------------------------------------------------
// Contribution calendar heatmap
// ---------------------------------------------------------------------------

// Indexed Sun=0..Sat=6.
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// GitHub's own calendar only labels every other weekday to avoid crowding the
// axis. This has to go through yaxis.labels.formatter rather than just
// blanking the unwanted series names: ApexCharts auto-thins heatmap row
// labels to whatever fits the chart's pixel height, by array position, and
// that thinning would just as easily strip out Mon/Wed/Fri as the blanks
// depending on how many rows fit - a user-supplied formatter is the
// documented way to opt out of that auto-thinning entirely.
export const VISIBLE_WEEKDAYS = new Set(['Mon', 'Wed', 'Fri']);
// ApexCharts' heatmap renders series bottom-up (the last array entry ends up
// on top), the opposite of the Sun-first order the calendar is built in. This
// reverses the row order fed to the chart so Sunday still lands on top.
export const ROW_ORDER = [6, 5, 4, 3, 2, 1, 0];
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// Fixed row height for the calendar heatmap (always 7 weekday rows) plus
// room for the sparse month labels along the top - unlike the other bar
// charts, this doesn't scale with row count since rows are always 7.
export const CALENDAR_ROW_HEIGHT = 20;
export const CALENDAR_CHART_CHROME = 30;
// ACCENT_COLOR (#3987e5) as an r,g,b triple, for the heatmap's alpha-graduated color scale.
export const ACCENT_RGB = '57, 135, 229';
// The 5-step "Less -> More" scale, shared by the heatmap's colorScale ranges
// and its legend swatches so the two can never drift out of sync.
export const HEATMAP_LEVEL_COLORS = [
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
export const HEATMAP_GAP_COLOR = '#030712';
// The calendar grid always spans a full year (GitHub's own calendar does the
// same) regardless of which date-range filter is selected - only which days
// within that year are "active" changes. Days outside the selected filter
// (and any not-yet-happened days padding out the grid's final week) use this
// sentinel value so they can be colored distinctly from a real 0-commit day.
export const YEAR_DAYS = 365;
export const DISABLED_VALUE = -1;
// Between HEATMAP_GAP_COLOR and CHART_GRID_COLOR - a disabled day should
// read as even less present than a real "no activity" day, not more.
export const HEATMAP_DISABLED_COLOR = '#0b1220';

export const ACTIVITY_HEATMAP_CHART: ApexChart = {
  ...BASE_CHART,
  type: 'heatmap',
  height: 7 * CALENDAR_ROW_HEIGHT + CALENDAR_CHART_CHROME,
  animations: { enabled: false },
};
// Matches the page background - deliberately darker than the "no activity"
// cell fill (HEATMAP_LEVEL_COLORS[0]) so the gap is visible between cells
// even when neighboring cells both have zero activity.
export const ACTIVITY_HEATMAP_STROKE = { show: true, colors: [HEATMAP_GAP_COLOR], width: 4 };
// Default heatmap hover state lightens the cell (toward white), which reads
// as a stray flash against this dark theme - the tooltip already surfaces
// the value on hover, so the highlight itself is turned off.
export const ACTIVITY_HEATMAP_STATES = { hover: { filter: { type: 'none' as const } } };
export const ACTIVITY_HEATMAP_COLORS = [ACCENT_COLOR];
// Every other chart on this page styles its xaxis labels explicitly; the
// heatmap's row labels (Sun/Mon/... on the y-axis) need the same treatment,
// otherwise they fall back to ApexCharts' default label color, which is
// invisible against this dark theme. The formatter (see VISIBLE_WEEKDAYS
// above) is what actually keeps Mon/Wed/Fri showing regardless of height.
export const ACTIVITY_HEATMAP_YAXIS = {
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
