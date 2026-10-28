"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { apiClient } from "@/components/module-pos/api";
import { parseVariationName } from "@/components/module-pos/utils";

export interface SalesTotals {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  transactions: number;
  unitsSold: number;
  refundCount: number;
  averageTransaction: number;
}

export interface SalesLine extends SalesTotals {
  label: string;
  share: number;
}

export interface SalesProductLine {
  sku: string;
  productName: string;
  variationName: string;
  unitsSold: number;
  unitsReturned: number;
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  averageUnitPrice: number;
  share: number;
}

export interface SalesReportData {
  periodFrom: string | null;
  periodTo: string | null;
  previousFrom: string | null;
  previousTo: string | null;
  generatedAt: string;
  current: SalesTotals;
  previous: SalesTotals | null;
  byBranch: SalesLine[];
  byChannel: SalesLine[];
  byPaymentMethod: SalesLine[];
  byProduct: SalesProductLine[];
  trendGranularity: "day" | "month";
  trend: SalesLine[];
}

export interface SalesReportMeta {
  /** e.g. "October 1 – 31, 2026" */
  periodLabel: string;
  /** e.g. "All branches" or the branch name */
  branchLabel: string;
  preparedBy: string;
}

interface SalesReportProps extends SalesReportMeta {
  dateFrom?: string;
  dateTo?: string;
  locationId?: number;
  /** Lets the page export what is on screen. */
  onData?: (data: SalesReportData | null) => void;
}

// Table look shared with the Order Management and Location Management tables.
// Number headers use !text-right because pos-overrides.css forces th to text-align: left !important.
const TH = "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap";
const TR = "hover:bg-muted/10 transition-colors border-b border-border last:border-b-0";
const TD = "px-5 py-3.5 text-sm align-middle";
const NUM = "text-right tabular-nums whitespace-nowrap";
const TOTAL_ROW = "border-t-2 border-border bg-muted/30 font-semibold text-foreground";

export const COMPANY_NAME = "Bren Raphael's";

const pesoFmt = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Accounting style: negatives in parentheses. */
export const peso = (n: number) => (n < 0 ? `(₱${pesoFmt.format(-n)})` : `₱${pesoFmt.format(n)}`);
/** A deduction line (discounts, returns) shown as a negative. */
const deduction = (n: number) => (n === 0 ? peso(0) : `(₱${pesoFmt.format(n)})`);
const count = (n: number) => n.toLocaleString("en-PH");
const pct = (n: number) => `${n.toFixed(1)}%`;

const manilaDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", ...opts });

export function formatPeriod(from: string | null, to: string | null) {
  if (!from && !to) return "All dates";
  const fmt = (iso: string) => manilaDate(iso, { month: "short", day: "numeric", year: "numeric" });
  return `${from ? fmt(from) : "Earliest"} – ${to ? fmt(to) : "Today"}`;
}

const trendLabel = (key: string, granularity: "day" | "month") =>
  granularity === "day"
    ? new Date(`${key}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", weekday: "short" })
    : new Date(`${key}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", year: "numeric" });

function change(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  const diff = current - previous;
  const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : null;
  return { diff, percent };
}

function ChangeText({ current, previous, money = true }: { current: number; previous?: number; money?: boolean }) {
  const c = change(current, previous);
  if (!c) return <span className="text-muted-foreground">—</span>;
  const tone = c.diff > 0 ? "var(--metric-positive)" : c.diff < 0 ? "var(--metric-negative)" : undefined;
  const sign = c.diff > 0 ? "+" : "";
  return (
    <span className="font-semibold" style={{ color: tone }}>
      {money ? (c.diff < 0 ? peso(c.diff) : `${sign}${peso(c.diff)}`) : `${sign}${count(c.diff)}`}
    </span>
  );
}

function PercentChange({ current, previous }: { current: number; previous?: number }) {
  const c = change(current, previous);
  if (!c || c.percent === null) return <span className="text-muted-foreground">—</span>;
  const tone = c.diff > 0 ? "var(--metric-positive)" : c.diff < 0 ? "var(--metric-negative)" : undefined;
  return (
    <span className="font-semibold" style={{ color: tone }}>
      {c.percent > 0 ? "▲ " : c.percent < 0 ? "▼ " : ""}
      {Math.abs(c.percent).toFixed(1)}%
    </span>
  );
}

function Section({ number, title, subtitle, children, className }: {
  number: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-6 min-w-0",
        "print:rounded-none print:border-0 print:bg-transparent print:p-0",
        className
      )}
    >
      <div className="mb-5 print:mb-2 break-after-avoid">
        <h2 className="text-base font-semibold text-foreground m-0">
          <span className="text-primary mr-2 tabular-nums">{number}.</span>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 m-0">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TableFrame({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border print:overflow-visible print:rounded-md">
      <table className="w-full text-left border-collapse print:!min-w-0" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground m-0 py-6 text-center">{children}</p>;
}

/** Breakdown table for branch / channel / payment method lines. */
function BreakdownTable({ heading, lines, total, detailed }: {
  heading: string;
  lines: SalesLine[];
  total: SalesTotals;
  detailed: boolean;
}) {
  if (lines.length === 0) return <Empty>No sales in this period.</Empty>;
  return (
    <TableFrame minWidth={detailed ? 760 : 420}>
      <thead>
        <tr className="border-b border-border bg-muted/30">
          <th className={TH}>{heading}</th>
          <th className={cn(TH, "!text-right")}>Transactions</th>
          {detailed && <th className={cn(TH, "!text-right")}>Gross sales</th>}
          {detailed && <th className={cn(TH, "!text-right")}>Discounts</th>}
          {detailed && <th className={cn(TH, "!text-right")}>Returns</th>}
          <th className={cn(TH, "!text-right")}>Net sales</th>
          <th className={cn(TH, "!text-right")}>% of net</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.label} className={TR}>
            <td className={cn(TD, "font-medium text-muted-foreground")}>{l.label}</td>
            <td className={cn(TD, NUM)}>{count(l.transactions)}</td>
            {detailed && <td className={cn(TD, NUM)}>{peso(l.grossSales)}</td>}
            {detailed && <td className={cn(TD, NUM)}>{deduction(l.discounts)}</td>}
            {detailed && <td className={cn(TD, NUM)}>{deduction(l.returns)}</td>}
            <td className={cn(TD, NUM, "font-semibold text-foreground")}>{peso(l.netSales)}</td>
            <td className={cn(TD, NUM, "text-muted-foreground")}>{pct(l.share)}</td>
          </tr>
        ))}
        <tr className={TOTAL_ROW}>
          <td className={TD}>Total</td>
          <td className={cn(TD, NUM)}>{count(total.transactions)}</td>
          {detailed && <td className={cn(TD, NUM)}>{peso(total.grossSales)}</td>}
          {detailed && <td className={cn(TD, NUM)}>{deduction(total.discounts)}</td>}
          {detailed && <td className={cn(TD, NUM)}>{deduction(total.returns)}</td>}
          <td className={cn(TD, NUM)}>{peso(total.netSales)}</td>
          <td className={cn(TD, NUM)}>{total.netSales !== 0 ? "100.0%" : "—"}</td>
        </tr>
      </tbody>
    </TableFrame>
  );
}

// Slice colours: brand purple first, then hues tuned to sit beside it.
const PIE_COLORS = [
  "var(--primary)",
  "oklch(0.56 0.15 265)",
  "oklch(0.62 0.11 175)",
  "oklch(0.70 0.15 60)",
  "oklch(0.72 0.10 320)",
  "oklch(0.60 0.02 280)",
];

/** Pie of each line's share of net sales, with a legend of the figures behind it. */
function SharePie({ lines, total }: { lines: SalesLine[]; total: SalesTotals }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // A line with negative net sales (only refunds this period) can't be a slice; it stays in the legend.
  const slices = lines.map((l, i) => ({ ...l, color: PIE_COLORS[i % PIE_COLORS.length], value: Math.max(l.netSales, 0) }));
  const sum = slices.reduce((s, l) => s + l.value, 0);
  if (lines.length === 0 || sum <= 0) return <Empty>No sales in this period.</Empty>;

  const R = 70;
  const C = 80;
  const point = (a: number, r = R) => `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`;
  // Start and end angle of each slice, clockwise from 12 o'clock.
  const arcs = slices.reduce<{ start: number; end: number }[]>((acc, s) => {
    const start = acc.length ? acc[acc.length - 1].end : -Math.PI / 2;
    return [...acc, { start, end: start + (s.value / sum) * Math.PI * 2 }];
  }, []);
  // Resting slices use a light tint (like the badges); the hovered one shows its full colour.
  const fill = (color: string, i: number) =>
    hovered === i ? color : `color-mix(in oklch, ${color} ${hovered === null ? 55 : 30}%, white)`;
  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div
        className="relative shrink-0"
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setCursor({ x: e.clientX - box.left, y: e.clientY - box.top });
        }}
        onMouseLeave={() => {
          setHovered(null);
          setCursor(null);
        }}
      >
        <svg viewBox="0 0 160 160" className="size-40 overflow-visible" role="img" aria-label="Share of net sales">
          {slices.map((s, i) => {
            if (s.value <= 0) return null;
            const { start, end } = arcs[i];
            const sweep = end - start;
            // The hovered slice slides a little out from the centre.
            const mid = (start + end) / 2;
            const lift = hovered === i && sweep < Math.PI * 2 - 1e-6 ? 5 : 0;
            const shift = `translate(${lift * Math.cos(mid)}px, ${lift * Math.sin(mid)}px)`;
            const common = {
              fill: fill(s.color, i),
              stroke: "var(--card)",
              strokeWidth: 2,
              style: { transform: shift, transition: "transform 150ms, fill 150ms", cursor: "default" },
              onMouseEnter: () => setHovered(i),
            };
            if (sweep >= Math.PI * 2 - 1e-6) return <circle key={s.label} cx={C} cy={C} r={R} {...common} />;
            return (
              <path
                key={s.label}
                d={`M ${C} ${C} L ${point(start)} A ${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(end)} Z`}
                {...common}
              />
            );
          })}
        </svg>
        {active && cursor && (
          <div
            className="absolute z-10 w-max min-w-[170px] rounded-xl border border-border bg-popover px-3.5 py-3 shadow-lg pointer-events-none"
            style={{ left: cursor.x + 14, top: cursor.y + 14 }}
          >
            <p className="text-xs font-semibold text-foreground m-0 mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full shrink-0" style={{ background: active.color }} />
              {active.label}
            </p>
            <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Net sales</dt>
              <dd className="m-0 text-right font-semibold tabular-nums" style={{ color: "var(--primary)" }}>{peso(active.netSales)}</dd>
              <dt className="text-muted-foreground">Share</dt>
              <dd className="m-0 text-right tabular-nums text-foreground">{pct(active.share)}</dd>
              <dt className="text-muted-foreground">Transactions</dt>
              <dd className="m-0 text-right tabular-nums text-foreground">{count(active.transactions)}</dd>
              <dt className="text-muted-foreground">Avg transaction</dt>
              <dd className="m-0 text-right tabular-nums text-foreground">{peso(active.averageTransaction)}</dd>
            </dl>
          </div>
        )}
      </div>
      <ul className="flex-1 min-w-0 w-full m-0 p-0 list-none divide-y divide-border" onMouseLeave={() => setHovered(null)}>
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHovered(i)}
            className={cn(
              "flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg text-sm transition-colors",
              hovered === i && "bg-muted/60",
              hovered !== null && hovered !== i && "opacity-50"
            )}
          >
            <span className="size-2.5 rounded-full shrink-0" style={{ background: fill(s.color, i) }} />
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-foreground truncate">{s.label}</span>
              <span className="block text-xs text-muted-foreground">
                {count(s.transactions)} {s.transactions === 1 ? "transaction" : "transactions"}
              </span>
            </span>
            <span className="text-right tabular-nums">
              <span className="block font-semibold text-foreground">{peso(s.netSales)}</span>
              <span className="block text-xs text-muted-foreground">{pct(s.share)}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-2.5 text-sm font-semibold text-foreground">
          <span>Total net sales</span>
          <span className="tabular-nums">{peso(total.netSales)}</span>
        </li>
      </ul>
    </div>
  );
}

function KeyFigure({ label, value, current, previous, money = true }: {
  label: string;
  value: string;
  current: number;
  previous?: number;
  money?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 min-w-0 print:p-3 print:rounded-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground m-0">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums mt-2 mb-1 truncate print:text-lg print:mt-1">{value}</p>
      <p className="text-xs text-muted-foreground m-0 flex flex-wrap items-center gap-x-1.5">
        <PercentChange current={current} previous={previous} />
        <span>vs previous period</span>
        {previous !== undefined && (
          <span className="tabular-nums">({money ? peso(previous) : count(previous)})</span>
        )}
      </p>
    </div>
  );
}

function TrendChart({ data }: { data: SalesReportData }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = data.trend;
  const max = Math.max(...points.map((p) => p.netSales), 0);
  if (points.length === 0 || max <= 0) return <Empty>No net sales to chart in this period.</Empty>;
  // Label roughly every seventh day so the axis stays readable.
  const step = data.trendGranularity === "day" ? Math.max(1, Math.ceil(points.length / 8)) : 1;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-48 border-b border-border" onMouseLeave={() => setHovered(null)}>
        {points.map((p, i) => {
          const height = p.netSales > 0 ? Math.max(2, (p.netSales / max) * 100) : 0;
          const active = hovered === i;
          // Keep the card inside the chart near either edge.
          const align = i < points.length / 4 ? "left-0" : i > (points.length * 3) / 4 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div
              key={p.label}
              className={cn("relative flex-1 h-full flex items-end min-w-0 rounded-t-[4px] cursor-default", active && "bg-muted/60")}
              onMouseEnter={() => setHovered(i)}
            >
              <div
                className="w-full rounded-t-[4px] transition-opacity duration-150"
                style={{
                  height: `${height}%`,
                  background: "var(--primary)",
                  opacity: hovered === null ? 0.75 : active ? 1 : 0.35,
                }}
              />
              {active && (
                <div
                  className={cn(
                    "absolute z-10 w-max min-w-[180px] rounded-xl border border-border bg-popover px-3.5 py-3 shadow-lg pointer-events-none",
                    align
                  )}
                  style={{ bottom: `calc(${height}% + 8px)` }}
                >
                  <p className="text-xs font-semibold text-foreground m-0 mb-2">{trendLabel(p.label, data.trendGranularity)}</p>
                  <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Net sales</dt>
                    <dd className="m-0 text-right font-semibold tabular-nums" style={{ color: "var(--primary)" }}>{peso(p.netSales)}</dd>
                    <dt className="text-muted-foreground">Gross sales</dt>
                    <dd className="m-0 text-right tabular-nums text-foreground">{peso(p.grossSales)}</dd>
                    {p.discounts > 0 && (
                      <>
                        <dt className="text-muted-foreground">Discounts</dt>
                        <dd className="m-0 text-right tabular-nums text-foreground">{deduction(p.discounts)}</dd>
                      </>
                    )}
                    {p.returns > 0 && (
                      <>
                        <dt className="text-muted-foreground">Returns</dt>
                        <dd className="m-0 text-right tabular-nums text-foreground">{deduction(p.returns)}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Transactions</dt>
                    <dd className="m-0 text-right tabular-nums text-foreground">{count(p.transactions)}</dd>
                    <dt className="text-muted-foreground">Units sold</dt>
                    <dd className="m-0 text-right tabular-nums text-foreground">{count(p.unitsSold)}</dd>
                  </dl>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {points.map((p, i) => (
          <div
            key={p.label}
            className={cn(
              "flex-1 min-w-0 text-center text-[10px] tabular-nums whitespace-nowrap overflow-visible",
              hovered === i ? "text-foreground font-semibold" : "text-muted-foreground"
            )}
          >
            {i % step === 0 || hovered === i
              ? data.trendGranularity === "day"
                ? new Date(`${p.label}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" })
                : new Date(`${p.label}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short" })
              : ""}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground m-0">
        Peak: {peso(max)} · Average per {data.trendGranularity}: {peso(points.reduce((s, p) => s + p.netSales, 0) / points.length)}
      </p>
    </div>
  );
}

/**
 * Company sales report: letterhead, key figures, a sales summary set out like an
 * income-statement sales section (gross → discounts → returns → net) against the
 * previous period, then breakdowns by branch, channel, payment method, product and day.
 */
export function SalesReport({ dateFrom, dateTo, locationId, periodLabel, branchLabel, preparedBy, onData }: SalesReportProps) {
  // The result remembers which filters it was loaded for; any other filters mean it's still loading.
  const requestKey = `${dateFrom ?? ""}|${dateTo ?? ""}|${locationId ?? ""}`;
  const [result, setResult] = useState<{ key: string; data: SalesReportData | null } | null>(null);
  const isLoading = result?.key !== requestKey;
  const data = isLoading ? null : result.data;
  const failed = !isLoading && !data;

  useEffect(() => {
    let cancelled = false;
    onData?.(null);
    apiClient.instance
      .get<SalesReportData>("/api-pos/analytics/sales-report", {
        params: { DateFrom: dateFrom || undefined, DateTo: dateTo || undefined, LocationId: locationId },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setResult({ key: requestKey, data });
        onData?.(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load the sales report:", err);
        setResult({ key: requestKey, data: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-foreground m-0">The sales report could not be loaded.</p>
        <p className="text-xs text-muted-foreground mt-1 m-0">Check your connection and try again.</p>
      </div>
    );
  }

  const cur = data.current;
  const prev = data.previous ?? undefined;
  const showBranches = data.byBranch.length > 1 || !locationId;
  const generated = new Date(data.generatedAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let n = 0;
  const next = () => ++n;

  const summaryRows: { label: string; current: number; previous?: number; kind: "money" | "deduction" | "count"; strong?: boolean; indent?: boolean }[] = [
    { label: "Gross sales", current: cur.grossSales, previous: prev?.grossSales, kind: "money" },
    { label: "Less: Senior Citizen / PWD discounts", current: cur.discounts, previous: prev?.discounts, kind: "deduction", indent: true },
    { label: "Less: Sales returns and refunds", current: cur.returns, previous: prev?.returns, kind: "deduction", indent: true },
    { label: "Net sales", current: cur.netSales, previous: prev?.netSales, kind: "money", strong: true },
  ];
  const statRows: { label: string; current: number; previous?: number; money: boolean }[] = [
    { label: "Number of transactions", current: cur.transactions, previous: prev?.transactions, money: false },
    { label: "Units sold", current: cur.unitsSold, previous: prev?.unitsSold, money: false },
    { label: "Refunds processed", current: cur.refundCount, previous: prev?.refundCount, money: false },
    { label: "Average transaction value", current: cur.averageTransaction, previous: prev?.averageTransaction, money: true },
  ];

  const productTotals = data.byProduct.reduce(
    (t, p) => ({
      unitsSold: t.unitsSold + p.unitsSold,
      unitsReturned: t.unitsReturned + p.unitsReturned,
      netSales: t.netSales + p.netSales,
    }),
    { unitsSold: 0, unitsReturned: 0, netSales: 0 }
  );

  return (
    // On paper the report is a CSS table, so its header group repeats at the top of every page.
    <div className="sr-report print:table print:w-full">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="hidden print:table-header-group">
        <div className="print:table-row">
          <div className="print:table-cell">
            <PrintHeader periodLabel={periodLabel} branchLabel={branchLabel} />
          </div>
        </div>
      </div>

      <div className="print:table-row-group">
        <div className="print:table-row">
          <div className="print:table-cell">
          <div className="space-y-6 print:space-y-5">
            {/* Letterhead; on paper only its details strip is shown, under the running header. */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden break-inside-avoid print:rounded-md print:bg-muted/30">
              <div className="h-1.5 bg-primary print:hidden" />
              <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-5 print:p-3">
                <div className="min-w-0 print:hidden">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary m-0">{COMPANY_NAME}</p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mt-1 mb-0">Sales Report</h2>
                  <p className="text-sm text-muted-foreground mt-1 m-0">For the period {periodLabel}</p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm m-0 print:grid-cols-4 print:w-full">
                  {[
                    ["Branch", branchLabel],
                    ["Compared with", data.previousFrom ? formatPeriod(data.previousFrom, data.previousTo) : "—"],
                    ["Prepared by", preparedBy || "—"],
                    ["Generated", generated],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
                      <dd className="m-0 mt-0.5 font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* Key figures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 break-inside-avoid print:grid-cols-4 print:gap-3">
              <KeyFigure label="Net sales" value={peso(cur.netSales)} current={cur.netSales} previous={prev?.netSales} />
              <KeyFigure label="Transactions" value={count(cur.transactions)} current={cur.transactions} previous={prev?.transactions} money={false} />
              <KeyFigure label="Average transaction" value={peso(cur.averageTransaction)} current={cur.averageTransaction} previous={prev?.averageTransaction} />
              <KeyFigure label="Units sold" value={count(cur.unitsSold)} current={cur.unitsSold} previous={prev?.unitsSold} money={false} />
            </div>

            <Section number={next()} title="Sales summary" subtitle="This period against the previous period of the same length">
              <TableFrame minWidth={680}>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className={cn(TH, "w-[36%]")}>Particulars</th>
                    <th className={cn(TH, "!text-right")}>This period</th>
                    <th className={cn(TH, "!text-right")}>Previous period</th>
                    <th className={cn(TH, "!text-right")}>Change</th>
                    <th className={cn(TH, "!text-right")}>% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((r) => {
                    const fmt = (v?: number) => (v === undefined ? "—" : r.kind === "deduction" ? deduction(v) : peso(v));
                    // A rise in a deduction lowers net sales, so its change is shown against net.
                    const sign = r.kind === "deduction" ? -1 : 1;
                    return (
                      <tr
                        key={r.label}
                        className={cn(
                          r.strong ? "border-t-2 border-border bg-primary/5 font-bold text-foreground" : TR
                        )}
                      >
                        <td className={cn(TD, r.indent && "pl-9", r.strong ? "text-foreground" : "text-muted-foreground font-medium")}>{r.label}</td>
                        <td className={cn(TD, NUM, r.strong && "underline decoration-double underline-offset-4")}>{fmt(r.current)}</td>
                        <td className={cn(TD, NUM, "text-muted-foreground")}>{fmt(r.previous)}</td>
                        <td className={cn(TD, NUM)}>
                          <ChangeText current={sign * r.current} previous={r.previous === undefined ? undefined : sign * r.previous} />
                        </td>
                        <td className={cn(TD, NUM)}>
                          <PercentChange current={sign * r.current} previous={r.previous === undefined ? undefined : sign * r.previous} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={5} className="px-5 pt-5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border">
                      Sales statistics
                    </td>
                  </tr>
                  {statRows.map((r) => (
                    <tr key={r.label} className={TR}>
                      <td className={cn(TD, "text-muted-foreground font-medium")}>{r.label}</td>
                      <td className={cn(TD, NUM, "text-foreground")}>{r.money ? peso(r.current) : count(r.current)}</td>
                      <td className={cn(TD, NUM, "text-muted-foreground")}>
                        {r.previous === undefined ? "—" : r.money ? peso(r.previous) : count(r.previous)}
                      </td>
                      <td className={cn(TD, NUM)}><ChangeText current={r.current} previous={r.previous} money={r.money} /></td>
                      <td className={cn(TD, NUM)}><PercentChange current={r.current} previous={r.previous} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableFrame>
            </Section>

            <Section
              number={next()}
              title={data.trendGranularity === "day" ? "Daily net sales" : "Monthly net sales"}
              subtitle="Net sales over the period; hover a bar for the figure"
              className="print:hidden"
            >
              <TrendChart data={data} />
            </Section>

            {showBranches && (
              <Section number={next()} title="Sales by branch" subtitle="Where the period's sales were made">
                <BreakdownTable heading="Branch" lines={data.byBranch} total={cur} detailed />
              </Section>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:grid-cols-2 print:gap-5">
              <Section number={next()} title="Sales by channel" subtitle="Store/Walk-in, Bazaar and Institutional orders">
                {/* Pie on screen; the table carries the same figures on paper. */}
                <div className="print:hidden"><SharePie lines={data.byChannel} total={cur} /></div>
                <div className="hidden print:block">
                  <BreakdownTable heading="Channel" lines={data.byChannel} total={cur} detailed={false} />
                </div>
              </Section>
              <Section number={next()} title="Sales by payment method" subtitle="How customers paid">
                <div className="print:hidden"><SharePie lines={data.byPaymentMethod} total={cur} /></div>
                <div className="hidden print:block">
                  <BreakdownTable heading="Payment method" lines={data.byPaymentMethod} total={cur} detailed={false} />
                </div>
              </Section>
            </div>

            <Section number={next()} title="Sales by product" subtitle="Each product variation, ranked by net sales; sales mix is its share of gross sales">
              {data.byProduct.length === 0 ? (
                <Empty>No products sold in this period.</Empty>
              ) : (
                <TableFrame minWidth={860}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className={TH}>SKU</th>
                      <th className={TH}>Product</th>
                      <th className={cn(TH, "!text-right")}>Units sold</th>
                      <th className={cn(TH, "!text-right")}>Returned</th>
                      <th className={cn(TH, "!text-right")}>Avg price</th>
                      <th className={cn(TH, "!text-right")}>Net sales</th>
                      <th className={cn(TH, "!text-right")}>Sales mix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProduct.map((p) => {
                      const parsed = parseVariationName(p.variationName);
                      const variant = [parsed.packaging, parsed.size].filter(Boolean).join(" · ");
                      return (
                        <tr key={`${p.sku}|${p.productName}|${p.variationName}`} className={TR}>
                          <td className={cn(TD, "font-mono text-xs text-muted-foreground whitespace-nowrap")}>{p.sku || parsed.sku || "—"}</td>
                          <td className={TD}>
                            <span className="font-medium text-foreground">{p.productName}</span>
                            {variant && <span className="block text-xs text-muted-foreground mt-0.5">{variant}</span>}
                          </td>
                          <td className={cn(TD, NUM)}>{count(p.unitsSold)}</td>
                          <td className={cn(TD, NUM, "text-muted-foreground")}>{p.unitsReturned ? count(p.unitsReturned) : "—"}</td>
                          <td className={cn(TD, NUM, "text-muted-foreground")}>{p.unitsSold ? peso(p.averageUnitPrice) : "—"}</td>
                          <td className={cn(TD, NUM, "font-semibold text-foreground")}>{peso(p.netSales)}</td>
                          <td className={cn(TD, NUM, "text-muted-foreground")}>{pct(p.share)}</td>
                        </tr>
                      );
                    })}
                    <tr className={TOTAL_ROW}>
                      <td className={TD} colSpan={2}>Total</td>
                      <td className={cn(TD, NUM)}>{count(productTotals.unitsSold)}</td>
                      <td className={cn(TD, NUM)}>{productTotals.unitsReturned ? count(productTotals.unitsReturned) : "—"}</td>
                      <td className={cn(TD, NUM)}>{cur.unitsSold ? peso((cur.grossSales - cur.discounts) / cur.unitsSold) : "—"}</td>
                      <td className={cn(TD, NUM)}>{peso(productTotals.netSales)}</td>
                      <td className={cn(TD, NUM)}>{cur.grossSales ? "100.0%" : "—"}</td>
                    </tr>
                  </tbody>
                </TableFrame>
              )}
            </Section>

            <Section
              number={next()}
              title={data.trendGranularity === "day" ? "Daily sales" : "Monthly sales"}
              subtitle="Sales by order date; returns by the date the refund was approved"
            >
              {data.trend.length === 0 ? (
                <Empty>No sales in this period.</Empty>
              ) : (
                <TableFrame minWidth={760}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className={TH}>{data.trendGranularity === "day" ? "Date" : "Month"}</th>
                      <th className={cn(TH, "!text-right")}>Transactions</th>
                      <th className={cn(TH, "!text-right")}>Units</th>
                      <th className={cn(TH, "!text-right")}>Gross sales</th>
                      <th className={cn(TH, "!text-right")}>Discounts</th>
                      <th className={cn(TH, "!text-right")}>Returns</th>
                      <th className={cn(TH, "!text-right")}>Net sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trend.map((d) => {
                      const idle = d.grossSales === 0 && d.returns === 0;
                      const dash = <span className="text-muted-foreground/60">—</span>;
                      return (
                        <tr key={d.label} className={cn(TR, idle && "text-muted-foreground")}>
                          <td className={cn(TD, "font-medium text-muted-foreground whitespace-nowrap")}>{trendLabel(d.label, data.trendGranularity)}</td>
                          <td className={cn(TD, NUM)}>{d.transactions ? count(d.transactions) : dash}</td>
                          <td className={cn(TD, NUM)}>{d.unitsSold ? count(d.unitsSold) : dash}</td>
                          <td className={cn(TD, NUM)}>{d.grossSales ? peso(d.grossSales) : dash}</td>
                          <td className={cn(TD, NUM)}>{d.discounts ? deduction(d.discounts) : dash}</td>
                          <td className={cn(TD, NUM)}>{d.returns ? deduction(d.returns) : dash}</td>
                          <td className={cn(TD, NUM, !idle && "font-semibold text-foreground")}>{idle ? dash : peso(d.netSales)}</td>
                        </tr>
                      );
                    })}
                    <tr className={TOTAL_ROW}>
                      <td className={TD}>Total</td>
                      <td className={cn(TD, NUM)}>{count(cur.transactions)}</td>
                      <td className={cn(TD, NUM)}>{count(cur.unitsSold)}</td>
                      <td className={cn(TD, NUM)}>{peso(cur.grossSales)}</td>
                      <td className={cn(TD, NUM)}>{deduction(cur.discounts)}</td>
                      <td className={cn(TD, NUM)}>{deduction(cur.returns)}</td>
                      <td className={cn(TD, NUM)}>{peso(cur.netSales)}</td>
                    </tr>
                  </tbody>
                </TableFrame>
              )}
            </Section>

            {/* Notes and sign-off */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 break-inside-avoid">
              <h2 className="text-base font-semibold text-foreground m-0 mb-3">Notes to the report</h2>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground m-0">
                <li>All amounts are in Philippine pesos (₱). Amounts in parentheses are deductions or decreases.</li>
                <li>
                  Sales are recognised on the date the order was placed and include orders marked Completed, including ones
                  later refunded. Pending, cancelled and voided orders are excluded.
                </li>
                <li>
                  Returns and refunds are recognised on the date the refund was approved, so a refund can relate to a sale
                  from an earlier period.
                </li>
                <li>
                  Senior Citizen / PWD discounts are the 20% discount and the 12% VAT exemption given at checkout, shown
                  against the regular selling price.
                </li>
                <li>{COMPANY_NAME} is not VAT-registered; no output VAT is included in these amounts.</li>
              </ol>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10 print:grid-cols-3">
                {[
                  ["Prepared by", preparedBy],
                  ["Reviewed by", ""],
                  ["Approved by", ""],
                ].map(([role, name]) => (
                  <div key={role}>
                    <div className="h-8 border-b border-foreground/40 flex items-end pb-1 text-sm font-medium text-foreground">{name}</div>
                    <p className="text-xs text-muted-foreground mt-1.5 m-0">{role}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Running header printed at the top of every page: enterprise logo, POS badge, report title. */
function PrintHeader({ periodLabel, branchLabel }: { periodLabel: string; branchLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-6 pb-3 mb-5 border-b-2 border-primary">
      <div className="flex items-center gap-3">
        <Image
          src="/images/bren-raphaels-logo.svg"
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 rounded-[9px]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold text-zinc-900 leading-none">{COMPANY_NAME}</span>
          <span className="text-[10px] font-semibold bg-[#f3e8ff] text-[#6d28d9] px-2 py-[2px] rounded-md w-fit">
            Point of Sale
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-foreground m-0 leading-tight">Sales Report</p>
        <p className="text-xs text-muted-foreground m-0 mt-0.5">{periodLabel}</p>
        <p className="text-xs text-muted-foreground m-0">{branchLabel}</p>
      </div>
    </div>
  );
}

/**
 * A4 page setup for the printed report. The page footer comes from @page margin boxes,
 * which replace the browser's own date/URL header and footer where supported.
 */
const PRINT_CSS = `
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm 12mm 14mm;
    @bottom-left {
      content: "${COMPANY_NAME} \\00B7 Sales Report \\00B7 For internal use";
      font-family: Inter, system-ui, sans-serif;
      font-size: 7.5pt;
      color: #71717a;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: Inter, system-ui, sans-serif;
      font-size: 7.5pt;
      color: #71717a;
    }
  }
  html, body { background: #fff !important; }
  .sr-report { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sr-report tr { break-inside: avoid; }
  .sr-report table th { padding: 6px 8px !important; font-size: 7pt !important; }
  .sr-report table td { padding: 5px 8px !important; font-size: 8.5pt !important; }
}
`;

/** The whole report as CSV, section by section, for spreadsheets. */
export function salesReportCsv(data: SalesReportData, meta: SalesReportMeta) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const money = (n: number) => n.toFixed(2);
  const rows: (string | number)[][] = [];
  const blank = () => rows.push([]);

  rows.push([`${COMPANY_NAME} — Sales Report`]);
  rows.push(["Period", meta.periodLabel]);
  rows.push(["Branch", meta.branchLabel]);
  if (data.previousFrom) rows.push(["Compared with", formatPeriod(data.previousFrom, data.previousTo)]);
  rows.push(["Prepared by", meta.preparedBy]);
  rows.push(["Generated", new Date(data.generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })]);
  blank();

  const prev = data.previous;
  rows.push(["SALES SUMMARY"]);
  rows.push(["Particulars", "This period", "Previous period"]);
  rows.push(["Gross sales", money(data.current.grossSales), prev ? money(prev.grossSales) : ""]);
  rows.push(["Less: Senior Citizen / PWD discounts", money(-data.current.discounts), prev ? money(-prev.discounts) : ""]);
  rows.push(["Less: Sales returns and refunds", money(-data.current.returns), prev ? money(-prev.returns) : ""]);
  rows.push(["Net sales", money(data.current.netSales), prev ? money(prev.netSales) : ""]);
  rows.push(["Number of transactions", data.current.transactions, prev?.transactions ?? ""]);
  rows.push(["Units sold", data.current.unitsSold, prev?.unitsSold ?? ""]);
  rows.push(["Refunds processed", data.current.refundCount, prev?.refundCount ?? ""]);
  rows.push(["Average transaction value", money(data.current.averageTransaction), prev ? money(prev.averageTransaction) : ""]);
  blank();

  const breakdown = (title: string, heading: string, lines: SalesLine[]) => {
    rows.push([title]);
    rows.push([heading, "Transactions", "Gross sales", "Discounts", "Returns", "Net sales", "% of net"]);
    lines.forEach((l) =>
      rows.push([l.label, l.transactions, money(l.grossSales), money(-l.discounts), money(-l.returns), money(l.netSales), l.share.toFixed(1)])
    );
    blank();
  };
  breakdown("SALES BY BRANCH", "Branch", data.byBranch);
  breakdown("SALES BY CHANNEL", "Channel", data.byChannel);
  breakdown("SALES BY PAYMENT METHOD", "Payment method", data.byPaymentMethod);

  rows.push(["SALES BY PRODUCT"]);
  rows.push(["SKU", "Product", "Variation", "Units sold", "Units returned", "Average price", "Gross sales", "Discounts", "Returns", "Net sales", "Sales mix %"]);
  data.byProduct.forEach((p) => {
    const parsed = parseVariationName(p.variationName);
    rows.push([
      p.sku || parsed.sku,
      p.productName,
      [parsed.packaging, parsed.size].filter(Boolean).join(" ") || p.variationName,
      p.unitsSold,
      p.unitsReturned,
      money(p.averageUnitPrice),
      money(p.grossSales),
      money(-p.discounts),
      money(-p.returns),
      money(p.netSales),
      p.share.toFixed(1),
    ]);
  });
  blank();

  rows.push([data.trendGranularity === "day" ? "DAILY SALES" : "MONTHLY SALES"]);
  rows.push([data.trendGranularity === "day" ? "Date" : "Month", "Transactions", "Units", "Gross sales", "Discounts", "Returns", "Net sales"]);
  data.trend.forEach((d) =>
    rows.push([d.label, d.transactions, d.unitsSold, money(d.grossSales), money(-d.discounts), money(-d.returns), money(d.netSales)])
  );

  return rows.map((r) => r.map(q).join(",")).join("\r\n");
}
