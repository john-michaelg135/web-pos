"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Info,
  Globe,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// ── API shape (GET /api-pos/dashboard/owner) ────────────────────────

type Period = "today" | "week" | "month";

interface Kpi {
  current: number;
  previous: number;
}

interface OwnerDashboard {
  period: Period;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  sales: Kpi;
  orders: Kpi;
  averageSale: Kpi;
  itemsSold: Kpi;
  trend: { label: string; sales: number; previousSales: number; isFuture: boolean }[];
  salesByBranch: { locationId: number; name: string; sales: number; orders: number }[];
  topProducts: { productName: string; variationName: string; unitsSold: number; sales: number }[];
  salesByChannel: { channel: string; sales: number; orders: number }[];
  attention: {
    unpaidBalanceAmount: number;
    unpaidBalanceOrders: number;
    readyToShip: number;
    onlineOrdersToApprove: number;
    refundRequests: number;
    voidRequests: number;
    lowStockCount: number;
    lowStockItems: { productName: string; variationName: string; branchName: string; quantity: number; reorderLevel: number }[];
  };
  branchesToday: { locationId: number; name: string; shiftStatus: string; salesToday: number; cashOverShort: number | null }[];
}

const PERIODS: { value: Period; label: string; compareTo: string }[] = [
  { value: "today", label: "Today", compareTo: "yesterday" },
  { value: "week", label: "This Week", compareTo: "same days last week" },
  { value: "month", label: "This Month", compareTo: "same days last month" },
];

const CHANNEL_COLORS: Record<string, string> = {
  "Walk-in": "var(--primary)",
  Institutional: "var(--chart-2)",
};

// ── Formatting ──────────────────────────────────────────────────────

const peso = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pesoShort = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}₱${Math.round(abs)}`;
};

const count = (value: number) => value.toLocaleString("en-PH");

/** "UBH-SM-250|Pouch|250g" → "Pouch · 250g". Product codes are not shown to the owner. */
const describeVariation = (variation: string) =>
  variation
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !/^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(part))
    .join(" · ");

function greeting(date: Date) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

// ── Building blocks ─────────────────────────────────────────────────

function Panel({ title, subtitle, action, children, className }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6 min-w-0", className)}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground m-0">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 m-0">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Change({ kpi, compareTo }: { kpi: Kpi; compareTo: string }) {
  if (kpi.previous === 0) {
    return (
      <p className="text-xs text-muted-foreground m-0">
        {kpi.current === 0 ? `No change vs ${compareTo}` : `Nothing to compare ${compareTo}`}
      </p>
    );
  }
  const change = ((kpi.current - kpi.previous) / Math.abs(kpi.previous)) * 100;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="text-xs text-muted-foreground m-0 flex items-center gap-1 flex-wrap">
      <span
        className="inline-flex items-center gap-0.5 font-semibold"
        style={{ color: up ? "var(--metric-positive)" : "var(--metric-negative)" }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(change) < 0.5 ? "0" : Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}%
      </span>
      vs {compareTo}
    </p>
  );
}

function KpiCard({ label, value, kpi, compareTo, hint }: {
  label: string;
  value: string;
  kpi: Kpi;
  compareTo: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2 min-w-0" title={hint}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">{label}</p>
      <p className="text-2xl sm:text-[28px] font-bold text-foreground m-0 tabular-nums truncate">{value}</p>
      <Change kpi={kpi} compareTo={compareTo} />
    </div>
  );
}

function SalesTrend({ data, period, compareTo }: { data: OwnerDashboard["trend"]; period: Period; compareTo: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 1000;
  const height = 240;

  const values = data.flatMap((p) => [p.isFuture ? 0 : p.sales, p.previousSales]);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  // Round the top of the scale to a tidy number so the gridlines read cleanly.
  const step = rawMax <= 0 ? 100 : Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = rawMax <= 0 ? 400 : Math.ceil(rawMax / step) * step;
  const min = rawMin < 0 ? -Math.ceil(-rawMin / step) * step : 0;
  const span = max - min || 1;

  const x = (i: number) => (data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width);
  const y = (v: number) => height - ((v - min) / span) * height;

  const pastPoints = data.map((p, i) => ({ ...p, i })).filter((p) => !p.isFuture);
  const currentLine = pastPoints.map((p) => `${x(p.i)},${y(p.sales)}`).join(" ");
  const previousLine = data.map((p, i) => `${x(i)},${y(p.previousSales)}`).join(" ");
  const area = pastPoints.length
    ? `M${x(pastPoints[0].i)},${y(0)} L${currentLine.replaceAll(" ", " L")} L${x(pastPoints[pastPoints.length - 1].i)},${y(0)} Z`
    : "";

  const labelEvery = period === "today" ? 3 : period === "month" ? 5 : 1;
  const gridValues = [max, max - span / 4, max - span / 2, max - (span * 3) / 4, min];
  const hovered = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--primary)" }} /> This period
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-muted-foreground/50" /> {compareTo.charAt(0).toUpperCase() + compareTo.slice(1)}
        </span>
      </div>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="relative h-60 w-12 shrink-0 text-[10px] text-muted-foreground tabular-nums">
          {gridValues.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 4) * 100}%` }}>
              {pesoShort(v)}
            </span>
          ))}
        </div>
        <div className="relative h-60 flex-1 min-w-0">
          {gridValues.map((_, i) => (
            <div key={i} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${(i / 4) * 100}%` }} />
          ))}
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <polyline
              points={previousLine}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
            {area && <path d={area} fill="var(--primary)" fillOpacity={0.08} />}
            <polyline
              points={currentLine}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover != null && (
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {hovered && !hovered.isFuture && hover != null && (
            <span
              className="absolute h-2.5 w-2.5 rounded-full border-2 border-card -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${(x(hover) / width) * 100}%`, top: `${(y(hovered.sales) / height) * 100}%`, background: "var(--primary)" }}
            />
          )}
          {/* Hover targets, one per point */}
          <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
            {data.map((p, i) => (
              <div key={p.label} className="flex-1 h-full" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            ))}
          </div>
          {hovered && hover != null && (
            <div
              className="absolute top-0 z-10 pointer-events-none rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md whitespace-nowrap"
              style={{
                left: `${(x(hover) / width) * 100}%`,
                transform: `translateX(${hover > data.length / 2 ? "calc(-100% - 8px)" : "8px"})`,
              }}
            >
              <p className="font-semibold text-foreground m-0 mb-1">{hovered.label}</p>
              <p className="m-0 text-foreground tabular-nums">{hovered.isFuture ? "Not yet" : peso(hovered.sales)}</p>
              <p className="m-0 text-muted-foreground tabular-nums">{peso(hovered.previousSales)} {compareTo}</p>
            </div>
          )}
        </div>
      </div>
      {/* X axis */}
      <div className="relative h-5 ml-14 mt-2 text-[10px] text-muted-foreground">
        {data.map((p, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <span
              key={p.label}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(x(i) / width) * 100}%` }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function AttentionRow({ icon, tone, title, detail, href }: {
  icon: ReactNode;
  tone: "warning" | "destructive" | "info" | "purple";
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/60 transition-colors no-underline"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `var(--badge-${tone})`, color: `var(--badge-${tone}-foreground)` }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{detail}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
    </Link>
  );
}

// Table look shared with the Order Management and Location Management tables.
const TH = "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider";
const TR = "hover:bg-muted/10 transition-colors border-b border-border last:border-b-0";
const TD = "px-5 py-4 text-sm align-middle";

function ShiftPill({ status }: { status: string }) {
  const tone = status === "Open" ? "success" : status === "Closed" ? "info" : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-[6px] border whitespace-nowrap",
        !tone && "bg-muted text-muted-foreground border-border"
      )}
      style={
        tone
          ? {
              background: `var(--badge-${tone})`,
              color: `var(--badge-${tone}-foreground)`,
              borderColor: `color-mix(in oklch, var(--badge-${tone}-foreground) 20%, transparent)`,
            }
          : undefined
      }
    >
      {status === "Open" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />}
      {status}
    </span>
  );
}

function CashCount({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">Not counted yet</span>;
  if (Math.abs(value) < 0.005) return <span style={{ color: "var(--metric-positive)" }} className="font-semibold">Balanced</span>;
  return value < 0 ? (
    <span className="font-semibold" style={{ color: "var(--destructive)" }}>Short {peso(-value)}</span>
  ) : (
    <span className="font-semibold" style={{ color: "var(--badge-warning-foreground)" }}>Over {peso(value)}</span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} />;
}

// ── Dashboard ───────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user } = useAuth();
  const ownerName = user?.name;
  const [period, setPeriod] = useState<Period>("today");
  const [branch, setBranch] = useState<string>("all");
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isOwner = !!user?.isSuperUser;

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  }, []);
  const choosePeriod = (next: Period) => {
    if (next === period) return;
    setIsLoading(true);
    setPeriod(next);
  };
  const chooseBranch = (next: string) => {
    if (next === branch) return;
    setIsLoading(true);
    setBranch(next);
  };

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ period });
        if (branch !== "all") params.set("locationId", branch);
        const response = await fetch(`/api-pos/dashboard/owner?${params}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) {
          throw new Error(
            response.status === 401 ? "Your session has expired. Please sign in again."
            : response.status === 403 ? "Only the owner can view the dashboard."
            : "The dashboard could not be loaded.",
          );
        }
        const next = (await response.json()) as OwnerDashboard;
        if (cancelled) return;
        setData(next);
        setError(null);
        // The branch list comes from the all-branches view, so it stays complete when one branch is picked.
        if (branch === "all") {
          setBranches(next.branchesToday.map((b) => ({ value: String(b.locationId), label: b.name })));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The dashboard could not be loaded.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, period, branch, reloadKey]);

  // Keep the numbers fresh while the dashboard is left open.
  useEffect(() => {
    if (!isOwner) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1);
    }, 120_000);
    return () => window.clearInterval(id);
  }, [isOwner]);

  const compareTo = PERIODS.find((p) => p.value === period)!.compareTo;
  const periodLabel = PERIODS.find((p) => p.value === period)!.label;

  // The POS sells walk-in and institutional only; online orders belong to the e-commerce system.
  const channels = useMemo(() => (data ? data.salesByChannel.filter((c) => c.channel !== "Online") : []), [data]);
  const channelTotal = useMemo(() => channels.reduce((sum, c) => sum + Math.max(0, c.sales), 0), [channels]);
  const branchMax = useMemo(
    () => (data ? Math.max(0, ...data.salesByBranch.map((b) => b.sales)) : 0),
    [data],
  );

  const attention = data?.attention;
  const attentionRows = attention
    ? [
        attention.unpaidBalanceOrders > 0 && (
          <AttentionRow
            key="balance"
            icon={<Wallet className="h-4 w-4" />}
            tone="warning"
            title={`${peso(attention.unpaidBalanceAmount)} still to collect`}
            detail={`${count(attention.unpaidBalanceOrders)} institutional ${attention.unpaidBalanceOrders === 1 ? "order has" : "orders have"} paid only the downpayment`}
            href="/order-management"
          />
        ),
        attention.readyToShip > 0 && (
          <AttentionRow
            key="ship"
            icon={<PackageCheck className="h-4 w-4" />}
            tone="purple"
            title={`${count(attention.readyToShip)} ${attention.readyToShip === 1 ? "order" : "orders"} ready to ship`}
            detail="Fully paid and waiting for delivery"
            href="/order-management"
          />
        ),
        attention.onlineOrdersToApprove > 0 && (
          <AttentionRow
            key="online"
            icon={<Globe className="h-4 w-4" />}
            tone="info"
            title={`${count(attention.onlineOrdersToApprove)} new online ${attention.onlineOrdersToApprove === 1 ? "order" : "orders"}`}
            detail="Waiting to be accepted"
            href="/order-management"
          />
        ),
        attention.refundRequests > 0 && (
          <AttentionRow
            key="refund"
            icon={<RotateCcw className="h-4 w-4" />}
            tone="destructive"
            title={`${count(attention.refundRequests)} refund ${attention.refundRequests === 1 ? "request" : "requests"}`}
            detail="Waiting for approval"
            href="/order-management"
          />
        ),
        attention.voidRequests > 0 && (
          <AttentionRow
            key="void"
            icon={<Ban className="h-4 w-4" />}
            tone="destructive"
            title={`${count(attention.voidRequests)} void ${attention.voidRequests === 1 ? "request" : "requests"}`}
            detail="A sale someone wants to cancel"
            href="/order-management"
          />
        ),
        attention.lowStockCount > 0 && (
          <AttentionRow
            key="stock"
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="warning"
            title={`${count(attention.lowStockCount)} ${attention.lowStockCount === 1 ? "product is" : "products are"} running low`}
            detail={attention.lowStockItems
              .slice(0, 3)
              .map((s) => `${s.productName}${describeVariation(s.variationName) ? ` (${describeVariation(s.variationName)})` : ""} at ${s.branchName}`)
              .join(", ")}
            href="/stock-management"
          />
        ),
      ].filter(Boolean)
    : [];

  // The route guard already sends everyone else elsewhere; this keeps the page empty if they slip through.
  if (!isOwner) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting + controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground m-0">
            {greeting(new Date())}{ownerName ? `, ${ownerName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 m-0">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}Here&apos;s how the business is doing.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={period === p.value}
                onClick={() => choosePeriod(p.value)}
                className={cn(
                  "flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap",
                  period === p.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CustomSelect
            value={branch}
            onChange={chooseBranch}
            className="w-full sm:w-56"
            options={[{ value: "all", label: "All branches" }, ...branches]}
          />
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-foreground m-0">{error}</p>
          <button type="button" onClick={refresh} className="mt-3 text-sm font-semibold text-primary">
            Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-80" />
        </>
      )}

      {data && (
        <div className={cn("flex flex-col gap-6 transition-opacity", isLoading && "opacity-60")}>
          {/* Headline numbers */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Money collected" value={peso(data.sales.current)} kpi={data.sales} compareTo={compareTo} hint="Payments received from customers, after refunds" />
            <KpiCard label="Orders" value={count(data.orders.current)} kpi={data.orders} compareTo={compareTo} hint="Number of paid sales" />
            <KpiCard label="Average sale" value={peso(data.averageSale.current)} kpi={data.averageSale} compareTo={compareTo} hint="Typical amount per order" />
            <KpiCard label="Items sold" value={count(data.itemsSold.current)} kpi={data.itemsSold} compareTo={compareTo} hint="Units that left the store" />
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="m-0 text-muted-foreground">
              <span className="font-semibold text-foreground">Money Collected</span> counts payments on the day they are received,
              including downpayments, minus refunds. The{" "}
              <Link href="/manager/reports" className="font-semibold text-primary underline-offset-2 hover:underline">Sales Report</Link>{" "}
              shows <span className="font-semibold text-foreground">Completed Sales</span> instead: the full value of orders once they are
              marked Completed, on the day the order was placed. Downpayments and paid orders still waiting to be delivered appear
              here first, so the two totals can differ.
            </p>
          </div>

          {/* Trend + attention */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel
              title="Money collected over time"
              subtitle={period === "today" ? "By the hour" : "By the day"}
              className="xl:col-span-2"
            >
              <SalesTrend data={data.trend} period={period} compareTo={compareTo} />
            </Panel>
            <Panel title="Needs your attention" subtitle="Things waiting on someone right now">
              {attentionRows.length > 0 ? (
                <div className="flex flex-col gap-2">{attentionRows}</div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <PackageCheck className="h-8 w-8 mb-2" style={{ color: "var(--metric-positive)" }} aria-hidden />
                  <p className="text-sm font-semibold text-foreground m-0">All clear</p>
                  <p className="text-xs text-muted-foreground m-0 mt-1">Nothing is waiting on you.</p>
                </div>
              )}
            </Panel>
          </div>

          {/* Branches, products, channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <Panel title="Money collected by branch" subtitle={periodLabel}>
              {data.salesByBranch.length === 0 ? (
                <p className="text-sm text-muted-foreground m-0">No branches to show.</p>
              ) : (
                <ol className="flex flex-col gap-3.5 m-0 p-0 list-none">
                  {data.salesByBranch.map((b) => (
                    <li key={b.locationId} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-foreground">{b.name}</span>
                        <span className="shrink-0 font-semibold text-foreground tabular-nums">{peso(b.sales)}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${branchMax > 0 ? Math.max(0, (b.sales / branchMax) * 100) : 0}%`, background: "var(--primary)" }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground m-0 mt-1">
                        {count(b.orders)} {b.orders === 1 ? "order" : "orders"}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Best sellers" subtitle={`By value of paid orders, ${periodLabel.toLowerCase()}`}>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground m-0">No products sold yet.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border m-0 p-0 list-none">
                  {data.topProducts.map((p, i) => (
                    <li key={`${p.productName}-${p.variationName}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground truncate">{p.productName}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {[describeVariation(p.variationName), `${count(p.unitsSold)} sold`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{peso(p.sales)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Where the money comes from" subtitle={periodLabel} className="lg:col-span-2 xl:col-span-1">
              {channelTotal <= 0 ? (
                <p className="text-sm text-muted-foreground m-0">No sales yet.</p>
              ) : (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted gap-0.5" aria-hidden>
                    {channels
                      .filter((c) => c.sales > 0)
                      .map((c) => (
                        <div key={c.channel} style={{ width: `${(c.sales / channelTotal) * 100}%`, background: CHANNEL_COLORS[c.channel] }} />
                      ))}
                  </div>
                  <ul className="flex flex-col gap-3 m-0 mt-5 p-0 list-none">
                    {channels.map((c) => (
                      <li key={c.channel} className="flex items-center gap-3 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[c.channel] }} />
                        <span className="flex-1 text-foreground">{c.channel}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {channelTotal > 0 ? Math.round((Math.max(0, c.sales) / channelTotal) * 100) : 0}%
                        </span>
                        <span className="w-28 text-right font-semibold text-foreground tabular-nums">{peso(c.sales)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          {/* Branches today */}
          <Panel title="Branches today" subtitle="Who is open, what they've sold, and whether the cash count matched">
            {data.branchesToday.length === 0 ? (
              <p className="text-sm text-muted-foreground m-0">No branches to show.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className={`${TH} w-[36%]`}>Branch</th>
                      <th className={`${TH} w-[20%]`}>Shift</th>
                      <th className={`${TH} w-[22%]`}>Collected today</th>
                      <th className={TH}>Cash count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.branchesToday.map((b) => (
                      <tr key={b.locationId} className={TR}>
                        <td className={`${TD} font-medium text-muted-foreground`}>{b.name}</td>
                        <td className={TD}><ShiftPill status={b.shiftStatus} /></td>
                        <td className={`${TD} font-semibold text-foreground tabular-nums`}>{peso(b.salesToday)}</td>
                        <td className={`${TD} tabular-nums`}><CashCount value={b.cashOverShort} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="text-xs text-muted-foreground m-0 text-right">
            Updated {new Date(data.generatedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
