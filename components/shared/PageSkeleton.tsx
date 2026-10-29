import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Loading skeletons that mirror each page: real titles, tab labels and table headers,
 * the same containers and spacing, with pulsing blocks where the data will go.
 */

/** One pulsing placeholder block, in the owner dashboard's skeleton style. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-primary/[0.07] dark:bg-primary/15", className)} style={style} />;
}

/** What a column holds, so its placeholder has the right shape. */
export type CellKind = "text" | "short" | "num" | "badge" | "button" | "stack" | "variation";

function CellBone({ kind }: { kind: CellKind }) {
  switch (kind) {
    case "short":
      return <Bone className="h-4 w-16 rounded-md" />;
    case "num":
      return <Bone className="h-4 w-16 rounded-md ml-auto" />;
    case "badge":
      return <Bone className="h-6 w-20 rounded-md" />;
    case "button":
      return <Bone className="h-8 w-20 rounded-lg" />;
    case "stack":
      return (
        <div className="space-y-1.5">
          <Bone className="h-4 w-28 rounded-md" />
          <Bone className="h-3 w-16 rounded-md" />
        </div>
      );
    case "variation":
      return (
        <div className="flex gap-1.5">
          <Bone className="h-6 w-14 rounded-md" />
          <Bone className="h-6 w-12 rounded-md" />
          <Bone className="h-6 w-20 rounded-md" />
        </div>
      );
    default:
      return <Bone className="h-4 w-3/4 max-w-[180px] rounded-md" />;
  }
}

/** Placeholder rows for an existing table body: one cell per column, shaped by its kind. */
export function SkeletonRows({ columns, rows = 6, cellClassName = "px-5 py-4" }: {
  columns: CellKind[];
  rows?: number;
  cellClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden className="border-b border-border last:border-b-0">
          {columns.map((kind, c) => (
            <td key={c} className={cn(cellClassName, "align-middle")}>
              <CellBone kind={kind} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export interface SkeletonColumn {
  label: string;
  kind: CellKind;
  align?: "left" | "right" | "center";
  className?: string;
}

/** A table with its real header labels and placeholder rows, inside the given frame. */
export function SkeletonTable({ columns, rows = 6, frameClassName, headRowClassName, thClassName, cellClassName, minWidth }: {
  columns: SkeletonColumn[];
  rows?: number;
  frameClassName?: string;
  headRowClassName?: string;
  thClassName?: string;
  cellClassName?: string;
  minWidth?: number;
}) {
  return (
    <div className={cn("overflow-hidden", frameClassName)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr className={cn("border-b border-border bg-muted/30", headRowClassName)}>
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    thClassName ?? "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    col.align === "right" && "!text-right",
                    col.align === "center" && "!text-center",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonRows columns={columns.map((c) => c.kind)} rows={rows} cellClassName={cellClassName} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Page title block with the real heading and description; dynamic bits are placeholders. */
function PageTitle({ title, subtitle, badge = true, action }: {
  title: string;
  subtitle: string;
  badge?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-headline-md font-bold tracking-tight text-foreground">{title}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {badge && <Bone className="h-5 w-40 rounded-md" />}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Underlined tab row used on Stock Management and the Sales Report; the first tab is active. */
function OutlineTabs({ labels }: { labels: string[] }) {
  return (
    <div className="flex gap-2 border-b border-border">
      {labels.map((label, i) => (
        <span
          key={label}
          className={cn(
            "rounded-t-lg px-4 py-2.5 text-sm font-semibold border",
            i === 0 ? "bg-primary/10 text-primary border-primary" : "text-muted-foreground border-border"
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function Shell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("w-full min-h-full py-8 px-6 md:px-8 space-y-6", className)}>
      {children}
    </div>
  );
}

/** Generic page placeholder, used before we know which page's layout applies. */
export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <Shell label={label}>
      <div className="space-y-2.5">
        <Bone className="h-8 w-56 rounded-lg" />
        <Bone className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <Bone className="h-10 w-80 max-w-full rounded-xl" />
      <Bone className="h-96" />
    </Shell>
  );
}

// ── Stock Management ────────────────────────────────────────────────

function StockCardBone() {
  return (
    <div aria-hidden className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="h-1 w-full bg-muted" />
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <Bone className="h-3 w-24 rounded-md" />
        <Bone className="h-5 w-40 rounded-md" />
        <CellBone kind="variation" />
        <div className="flex items-end justify-between mt-3">
          <Bone className="h-9 w-20 rounded-lg" />
          <Bone className="h-6 w-20 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Bone className="h-3 w-20 rounded-md" />
            <Bone className="h-3 w-8 rounded-md" />
          </div>
          <Bone className="h-1.5 w-full rounded-full" />
        </div>
        <Bone className="h-9 w-full rounded-lg mt-1" />
      </div>
    </div>
  );
}

/** Stock Levels content: the search box, then cards (grid view) or the stock table. */
export function StockLevelsSkeleton({ viewMode = "grid", withSearch = true }: { viewMode?: "grid" | "table"; withSearch?: boolean }) {
  return (
    <div className="w-full min-w-0" role="status" aria-label="Loading stock levels">
      {withSearch && <Bone className="mb-5 h-10 w-full sm:max-w-[280px] rounded-xl" />}
      {viewMode === "table" ? (
        <SkeletonTable
          frameClassName="bg-card border border-border rounded-2xl shadow-sm"
          thClassName="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          cellClassName="px-6 py-4"
          rows={7}
          columns={[
            { label: "Variation", kind: "variation" },
            { label: "Product", kind: "text" },
            { label: "Location", kind: "badge" },
            { label: "Available Stock", kind: "num", align: "right" },
            { label: "Min. Threshold", kind: "num", align: "right" },
            { label: "Status", kind: "badge", align: "center" },
            { label: "Action", kind: "button", align: "center" },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <StockCardBone key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StockManagementSkeleton() {
  return (
    <Shell label="Loading stock">
      <PageTitle
        title="Stock Management"
        subtitle="Monitor stock levels, manage adjustments, and record new arrivals."
      />
      <OutlineTabs labels={["Stock Levels", "Receive Stock", "Stock History Log"]} />
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider max-md:sr-only">Location:</span>
          <Bone className="h-10 w-48 rounded-xl" />
          <Bone className="hidden md:block h-10 w-[72px] rounded-lg" />
        </div>
        <StockLevelsSkeleton />
      </div>
    </Shell>
  );
}

// ── Order Management ────────────────────────────────────────────────

const ORDER_TABS = ["Active", "Paid", "Completed", "Refunds", "Voids", "Cancelled"];

/** Orders list content: the list table (default) or order cards (grid view / phones). */
export function OrderListSkeleton({ viewMode = "list" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div role="status" aria-label="Loading orders" className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(450px,1fr))]">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading orders">
      <SkeletonTable
        frameClassName="bg-card border border-border rounded-xl shadow-sm"
        minWidth={800}
        rows={7}
        columns={[
          { label: "Date", kind: "stack" },
          { label: "Customer", kind: "text" },
          { label: "Order ID & Location", kind: "stack" },
          { label: "Total", kind: "short" },
          { label: "Status", kind: "badge" },
          { label: "Actions", kind: "button" },
        ]}
      />
    </div>
  );
}

export function OrderManagementSkeleton() {
  return (
    <Shell label="Loading orders">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <PageTitle title="Order Management" subtitle="Track and manage all orders" />
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-36 rounded-xl" />
          <Bone className="h-12 w-72 rounded-xl" />
          <Bone className="h-12 w-[88px] rounded-xl" />
          <Bone className="h-12 w-28 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden pb-3 border-b border-border">
        {ORDER_TABS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "shrink-0 h-10 px-4 inline-flex items-center gap-2 rounded-lg text-sm whitespace-nowrap",
              i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {label}
            <Bone className="h-5 w-5 rounded-full" />
          </span>
        ))}
      </div>
      <OrderListSkeleton />
    </Shell>
  );
}

// ── Product Management ──────────────────────────────────────────────

const PRODUCT_TH = "px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap";

/** Products / Variations tab content: the filter row, then that tab's table. */
export function ProductTableSkeleton({ tab = "products" }: { tab?: "products" | "variations" }) {
  return (
    <div className="w-full min-w-0" role="status" aria-label={`Loading ${tab}`}>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <Bone className="h-10 w-full sm:w-[200px] rounded-xl" />
        <Bone className="h-10 w-48 rounded-xl" />
        <Bone className="h-10 w-40 rounded-xl" />
      </div>
      <SkeletonTable
        frameClassName="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm"
        headRowClassName="bg-gray-50 dark:bg-gray-800"
        thClassName={PRODUCT_TH}
        rows={7}
        columns={
          tab === "products"
            ? [
                { label: "Product", kind: "text" },
                { label: "Category", kind: "badge" },
                { label: "Status", kind: "badge" },
              ]
            : [
                { label: "Product", kind: "text" },
                { label: "Packaging", kind: "short" },
                { label: "Size", kind: "short" },
                { label: "Price", kind: "short" },
                { label: "SKU", kind: "short" },
                { label: "Status", kind: "badge" },
                { label: "Actions", kind: "button" },
              ]
        }
      />
    </div>
  );
}

export function ProductManagementSkeleton() {
  return (
    <Shell label="Loading products">
      <PageTitle
        title="Product Management"
        subtitle="Manage products and variations"
        badge={false}
        action={<Bone className="h-9 w-full sm:w-36 rounded-md" />}
      />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {["Total Products", "Active", "Inactive"].map((label) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 sm:p-5">
            <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">{label}</div>
            <Bone className="h-8 w-14 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="flex items-center bg-muted p-1 rounded-xl w-full sm:w-fit">
        <span className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold bg-background text-primary shadow-sm">Products</span>
        <span className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold text-muted-foreground">Variations</span>
      </div>
      <ProductTableSkeleton />
    </Shell>
  );
}

// ── Location Management ─────────────────────────────────────────────

const LOCATION_TH = "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider";

/** Branches table body while it loads (inside the page's table card). */
export function BranchTableSkeleton() {
  return (
    <SkeletonTable
      minWidth={640}
      rows={5}
      thClassName={LOCATION_TH}
      columns={[
        { label: "Name", kind: "text", className: "w-[32%]" },
        { label: "Type", kind: "badge", className: "w-[22%]" },
        { label: "Status", kind: "badge", className: "w-[24%]" },
        { label: "Actions", kind: "button" },
      ]}
    />
  );
}

/** Staff table body while it loads (inside the page's table card). */
export function StaffTableSkeleton() {
  return (
    <SkeletonTable
      minWidth={720}
      rows={5}
      thClassName={LOCATION_TH}
      columns={[
        { label: "Employee", kind: "stack", className: "w-[28%]" },
        { label: "Role", kind: "badge", className: "w-[18%]" },
        { label: "Assigned Location", kind: "badge", className: "w-[32%]" },
        { label: "Actions", kind: "button" },
      ]}
    />
  );
}

export function LocationManagementSkeleton() {
  return (
    <Shell label="Loading locations">
      <div>
        <h1 className="text-headline-md font-bold tracking-tight text-foreground">Location Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage branches and assign staff to the locations they work at.</p>
      </div>
      <div className="space-y-4">
        <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-sm font-medium">
          <span className="px-3 py-1 rounded-md bg-background shadow-sm text-foreground">Branches</span>
          <span className="px-3 py-1 text-muted-foreground">Staff Assignment</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-base font-semibold text-foreground m-0">Branches</p>
            <Bone className="h-4 w-full max-w-[36rem] rounded-md" />
          </div>
          <Bone className="h-8 w-28 rounded-md" />
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <BranchTableSkeleton />
        </div>
      </div>
    </Shell>
  );
}

// ── Sales Processing ────────────────────────────────────────────────

/** Product Catalog content while products load: category heading and product cards (or list rows). */
export function ProductCatalogSkeleton({ view = "grid", isMobile = false }: { view?: "grid" | "list"; isMobile?: boolean }) {
  const heading = (
    <div className={cn("flex items-center gap-4", isMobile ? "mb-3" : "mb-4")}>
      <Bone className="h-3 w-24 rounded-md" />
      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
  if (view === "list") {
    return (
      <div role="status" aria-label="Loading products" className="flex flex-col gap-2">
        {heading}
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-44 rounded-md" />
              <Bone className="h-3 w-28 rounded-md" />
            </div>
            <Bone className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading products">
      {heading}
      <div className={cn("grid", isMobile ? "grid-cols-1 gap-3" : "gap-5 grid-cols-[repeat(auto-fill,minmax(330px,1fr))]")}>
        {Array.from({ length: 4 }, (_, i) => (
          // Same shape as a product card: icon tile, name, variation badges and price, stock pill.
          <div key={i} className={cn("flex items-center gap-3.5 border border-border rounded-xl bg-card", isMobile ? "p-2.5" : "p-3.5")}>
            <Bone className={cn("shrink-0 rounded-xl", isMobile ? "w-11 h-11" : "w-14 h-14")} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <Bone className="h-5 w-40 rounded-md" />
                <Bone className="h-5 w-32 rounded-full" />
              </div>
              <CellBone kind="variation" />
              <Bone className="h-6 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SalesProcessingSkeleton() {
  return (
    <Shell label="Loading sales processing" className="pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Sales Processing</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Process walk-in and institutional orders</span>
            <span>·</span>
            <Bone className="h-5 w-40 rounded-md" />
          </div>
        </div>
        <Bone className="h-9 w-32 rounded-xl" />
      </div>
      <Bone className="h-[54px] rounded-xl" />
      <div className="grid gap-6 grid-cols-1 md:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold m-0">Product Catalog</h2>
            <Bone className="h-9 w-[72px] rounded-lg" />
          </div>
          {/* Same padding and reserved scrollbar gutter as the real catalog, so the columns match. */}
          <div className="p-5 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
            <ProductCatalogSkeleton />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col min-h-[28rem]">
          <div className="px-5 py-4 border-b border-border">
            <Bone className="h-6 w-36 rounded-lg" />
          </div>
          <div className="p-5 space-y-3 flex-1">
            <Bone className="h-16 rounded-xl" />
            <Bone className="h-16 rounded-xl" />
          </div>
          <div className="p-5 border-t border-border space-y-3">
            <Bone className="h-5 w-full rounded-md" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ── Sales Report ────────────────────────────────────────────────────

/** Sales Report body: letterhead, key figures, the summary table and a chart section. */
export function ReportSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-primary/30" />
        <div className="p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2">
            <Bone className="h-3 w-28 rounded-md" />
            <Bone className="h-6 w-40 rounded-lg" />
            <Bone className="h-4 w-56 rounded-md" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            {["Branch", "Compared with", "Prepared by", "Generated"].map((label) => (
              <div key={label} className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground m-0">{label}</p>
                <Bone className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {["Net sales", "Transactions", "Average transaction", "Units sold"].map((label) => (
          <div key={label} className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground m-0">{label}</p>
            <Bone className="h-8 w-32 rounded-lg mt-2 mb-2" />
            <Bone className="h-3 w-40 rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <p className="text-base font-semibold text-foreground m-0">
          <span className="text-primary mr-2">1.</span>Sales summary
        </p>
        <SkeletonTable
          frameClassName="rounded-xl border border-border"
          minWidth={680}
          rows={4}
          columns={[
            { label: "Particulars", kind: "text", className: "w-[36%]" },
            { label: "This period", kind: "num", align: "right" },
            { label: "Previous period", kind: "num", align: "right" },
            { label: "Change", kind: "num", align: "right" },
            { label: "% Change", kind: "num", align: "right" },
          ]}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <p className="text-base font-semibold text-foreground m-0">
          <span className="text-primary mr-2">2.</span>Daily net sales
        </p>
        <div className="flex items-end gap-1 h-48 border-b border-border">
          {[30, 55, 20, 70, 45, 85, 35, 60, 25, 50, 75, 40].map((h, i) => (
            <Bone key={i} className="flex-1 rounded-b-none rounded-t-[4px]" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SalesReportPageSkeleton() {
  return (
    <Shell label="Loading sales report">
      <div className="flex flex-col gap-5">
        <PageTitle title="Sales Report" subtitle="Company sales for a period, compared with the period before." />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</span>
            <Bone className="h-10 w-[180px] rounded-xl" />
          </div>
          <div className="flex gap-3">
            <Bone className="h-9 w-24 rounded-md" />
            <Bone className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
      <OutlineTabs labels={["Sales Report", "Money Audit"]} />
      <ReportSkeleton />
    </Shell>
  );
}

// ── Money Audit ─────────────────────────────────────────────────────

/** Column shapes of the Money Audit records table (7 columns). */
export const MONEY_AUDIT_COLUMNS: CellKind[] = ["stack", "text", "text", "stack", "text", "stack", "badge"];

export function MoneyAuditSkeleton() {
  return (
    <div role="status" aria-label="Loading starting cash records" className="w-full space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {["Total Declarations", "Total Starting Cash"].map((label) => (
          <div key={label} className="w-full sm:w-72 p-5 bg-card border border-border rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
              <Bone className="h-8 w-28 rounded-lg" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10" />
          </div>
        ))}
      </div>
      <Bone className="h-10 w-full sm:max-w-[280px] rounded-xl" />
      <SkeletonTable
        frameClassName="border border-border rounded-xl bg-card"
        headRowClassName="text-[11px]"
        thClassName="px-5 py-3.5 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground"
        cellClassName="px-5 py-3.5"
        minWidth={900}
        rows={5}
        columns={[
          { label: "Date & Time", kind: "stack" },
          { label: "Cashier", kind: "text" },
          { label: "Branch", kind: "text" },
          { label: "Cash Summary", kind: "stack" },
          { label: "Closed By", kind: "text" },
          { label: "Closing Summary", kind: "stack" },
          { label: "Status", kind: "badge" },
        ]}
      />
    </div>
  );
}

// ── Owner dashboard ─────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="px-4 py-7 sm:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <Bone className="h-8 w-64 rounded-lg" />
            <Bone className="h-4 w-80 max-w-full rounded-md" />
          </div>
          <Bone className="h-10 w-72 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-32" />
          ))}
        </div>
        <Bone className="h-80" />
      </div>
    </div>
  );
}

// ── Route lookup ────────────────────────────────────────────────────

/** The skeleton for a POS route, for loading states that sit above the page (e.g. the branch check). */
export function RouteSkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/sales-processing")) return <SalesProcessingSkeleton />;
  if (pathname.startsWith("/order-management")) return <OrderManagementSkeleton />;
  if (pathname.startsWith("/product-management")) return <ProductManagementSkeleton />;
  if (pathname.startsWith("/stock-management")) return <StockManagementSkeleton />;
  if (pathname.startsWith("/location-management")) return <LocationManagementSkeleton />;
  if (pathname.startsWith("/manager/reports")) return <SalesReportPageSkeleton />;
  if (pathname.startsWith("/manager/starting-cash")) {
    return (
      <Shell label="Loading starting cash records">
        <div>
          <h2 className="font-bold tracking-tight text-foreground text-headline-md">Starting Cash</h2>
          <p className="mt-1 text-sm text-muted-foreground">The drawer cash each cashier declared before selling. Visible to managers only.</p>
        </div>
        <MoneyAuditSkeleton />
      </Shell>
    );
  }
  if (pathname === "/") return <DashboardSkeleton />;
  return <PageSkeleton />;
}
