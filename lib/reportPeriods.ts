// Period presets shared by the Sales Report and the owner dashboard.
// Dates are Philippine calendar days (UTC+8), whatever time zone the browser is in.

export type PeriodPreset = "this-month" | "last-month" | "this-quarter" | "year-to-date" | "all" | "custom";

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "year-to-date", label: "Year to date" },
  { value: "all", label: "All dates" },
  { value: "custom", label: "Custom range" },
];

// Earliest date with sales records.
export const MIN_REPORT_DATE = "2026-07-10";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Today's Philippine date as YYYY-MM-DD. */
export const manilaToday = () => ymd(new Date(Date.now() + 8 * 3600_000));

/** Philippine calendar date range for a preset, as YYYY-MM-DD strings ("" = open-ended). */
export function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date(Date.now() + 8 * 3600_000); // Manila "now", read with UTC getters
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const todayStr = ymd(today);
  switch (preset) {
    case "this-month":
      return { from: ymd(new Date(Date.UTC(y, m, 1))), to: todayStr };
    case "last-month":
      return { from: ymd(new Date(Date.UTC(y, m - 1, 1))), to: ymd(new Date(Date.UTC(y, m, 0))) };
    case "this-quarter":
      return { from: ymd(new Date(Date.UTC(y, m - (m % 3), 1))), to: todayStr };
    case "year-to-date":
      return { from: ymd(new Date(Date.UTC(y, 0, 1))), to: todayStr };
    default:
      return { from: "", to: "" };
  }
}
