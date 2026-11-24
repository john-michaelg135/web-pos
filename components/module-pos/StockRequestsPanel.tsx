"use client";

import { useMemo, useState } from "react";
import { ClipboardList, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/module-pos/SearchInput";
import {
  StockRequestStatusBadge,
  describeStockRequest,
  expectedUnits,
  formatWhenShort,
  isOpenStockRequest,
  stockRequestItemLabel,
  type StockRequestRecord,
} from "@/components/module-pos/StockRequestHistory";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "open", label: "Open", match: isOpenStockRequest },
  { value: "received", label: "Received", match: (r: StockRequestRecord) => r.status === "Fulfilled" },
  { value: "rejected", label: "Rejected", match: (r: StockRequestRecord) => r.status === "Rejected" },
  { value: "cancelled", label: "Cancelled", match: (r: StockRequestRecord) => r.status === "Cancelled" },
  { value: "all", label: "All", match: () => true },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

interface StockRequestsPanelProps {
  requests: StockRequestRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelect: (request: StockRequestRecord) => void;
  showBranch: boolean;
  /** Narrow the list to one item (from "View all for this item"). */
  itemFilter?: { variationId: number; label: string } | null;
  onClearItemFilter?: () => void;
}

/** Every request the branch (or, for owners, every branch) has sent to IMS. */
export function StockRequestsPanel({ requests, isLoading, onRefresh, onSelect, showBranch, itemFilter = null, onClearItemFilter }: StockRequestsPanelProps) {
  const [filter, setFilter] = useState<FilterValue>("open");
  const [search, setSearch] = useState("");

  const scoped = useMemo(
    () => (itemFilter ? requests.filter((r) => r.variationId === itemFilter.variationId) : requests),
    [requests, itemFilter],
  );
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, scoped.filter(f.match).length])) as Record<FilterValue, number>,
    [scoped],
  );
  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.value === filter)?.match ?? (() => true);
    const q = search.trim().toLowerCase();
    return scoped.filter((r) =>
      match(r) &&
      (!q ||
        r.requestId.toLowerCase().includes(q) ||
        stockRequestItemLabel(r).toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q)),
    );
  }, [scoped, filter, search]);

  const openCount = counts.open;
  const onTheWay = expectedUnits(scoped);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-lg font-bold text-foreground">Stock Requests</h2>
          <p className="m-0 mt-0.5 text-sm text-muted-foreground">
            {openCount > 0
              ? `${openCount} open request${openCount === 1 ? "" : "s"} · ${onTheWay} unit${onTheWay === 1 ? "" : "s"} expected from IMS.`
              : "Requests sent to IMS. Open an item in Stock Levels to request more."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="self-start sm:self-auto">
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {itemFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-foreground">Showing requests for <strong>{itemFilter.label}</strong>.</span>
          <Button variant="outline" size="sm" onClick={onClearItemFilter}>
            <X className="mr-1.5 h-3.5 w-3.5" /> Show all items
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Request status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", filter === f.value ? "bg-white/20" : "bg-muted")}>
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item, SKU or request ID…"
          aria-label="Search stock requests"
          maxLength={40}
          className="min-w-0 md:max-w-[280px]"
        />
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="m-0 mt-3 text-sm font-semibold text-foreground">
            {scoped.length === 0 ? "No stock requests yet" : "No requests match these filters"}
          </p>
          <p className="m-0 mt-1 max-w-sm text-sm text-muted-foreground">
            {scoped.length === 0
              ? "Open an item in Stock Levels and choose New request to ask IMS for more."
              : "Try another status or clear the search."}
          </p>
        </div>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
            {visible.map((r) => (
              <li key={r.requestId}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold text-foreground">{stockRequestItemLabel(r)}</p>
                      <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                        {r.requestId}{showBranch ? ` · ${r.locationName}` : ""} · {formatWhenShort(r.requestedAt)}
                      </p>
                    </div>
                    <StockRequestStatusBadge request={r} />
                  </div>
                  <p className="m-0 mt-2 text-xs text-foreground">{describeStockRequest(r)}</p>
                </button>
              </li>
            ))}
          </ul>

          {/* Tablets and up: a table, every column left-aligned */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                  {showBranch && <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>}
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((r) => (
                  <tr key={r.requestId} className="align-top transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-950/20">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-900 dark:text-white">{r.requestId}</td>
                    <td className="max-w-[280px] px-6 py-4">
                      <p className="m-0 truncate font-semibold text-foreground">{stockRequestItemLabel(r)}</p>
                      <p className="m-0 mt-1 truncate text-xs text-muted-foreground">{describeStockRequest(r)}</p>
                    </td>
                    {showBranch && (
                      <td className="px-6 py-4">
                        <span className="whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {r.locationName}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 tabular-nums">
                      <span className="font-black text-gray-900 dark:text-white">{r.approvedQuantity ?? r.quantity}</span>
                      {r.approvedQuantity !== null && r.approvedQuantity !== r.quantity && (
                        <span className="text-xs text-muted-foreground"> of {r.quantity}</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StockRequestStatusBadge request={r} /></td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatWhenShort(r.requestedAt)}
                      {r.requestedByName && <span className="mt-0.5 block truncate">{r.requestedByName}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => onSelect(r)}
                        aria-label={`View request ${r.requestId}`}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary/90"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
