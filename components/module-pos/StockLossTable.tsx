"use client";

import { useMemo, useState } from "react";
import { PackageX, RefreshCw } from "lucide-react";

import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Why units became unsellable (same values as api-pos StockLossReasons). */
export const STOCK_LOSS_REASONS = [
  { value: "Expired", label: "Expired", hint: "Past its best-before or expiry date." },
  { value: "Damaged", label: "Damaged", hint: "Broken, dented, leaking or contaminated packaging." },
  { value: "Mishandled", label: "Mishandled / spoiled", hint: "Spoiled through handling or storage (e.g. left unrefrigerated)." },
  { value: "Other", label: "Other", hint: "Anything else; describe what happened." },
] as const;

export type StockLossReason = (typeof STOCK_LOSS_REASONS)[number]["value"];

/** A recorded system loss (api-pos StockLossResponseDto). */
export interface StockLossRecord {
  lossId: number;
  variationId: number;
  variationName: string;
  productName: string;
  locationId: number;
  locationName: string;
  quantity: number;
  lossReason: string;
  notes?: string | null;
  unitPrice?: number | null;
  lossValue?: number | null;
  recordedByName?: string | null;
  recordedAt: string;
}

const pesoFmt = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const peso = (n: number) => `₱${pesoFmt.format(n)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const sizeLabel = (name: string) => (name.includes("|") ? name.split("|").slice(1).filter(Boolean).join(" · ") : name);
const reasonLabel = (value: string) => STOCK_LOSS_REASONS.find((r) => r.value === value)?.label ?? value;

/** Every system loss recorded at the selected branch, with units and sales value written off. */
export function StockLossTable({ losses, isLoading, onRefresh, showBranch }: {
  losses: StockLossRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  showBranch: boolean;
}) {
  const [reason, setReason] = useState("all");

  const visible = useMemo(
    () => (reason === "all" ? losses : losses.filter((l) => l.lossReason === reason)),
    [losses, reason],
  );
  const units = visible.reduce((t, l) => t + l.quantity, 0);
  const value = visible.reduce((t, l) => t + (l.lossValue ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Losses recorded", value: visible.length.toLocaleString("en-PH") },
          { label: "Units written off", value: units.toLocaleString("en-PH") },
          { label: "Sales value lost", value: peso(value), tone: "text-destructive" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</div>
            <div className={cn("mt-1 text-2xl font-bold tabular-nums text-foreground", card.tone)}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CustomSelect
          value={reason}
          onChange={setReason}
          className="w-full sm:w-56"
          options={[{ value: "all", label: "All reasons" }, ...STOCK_LOSS_REASONS.map((r) => ({ value: r.value, label: r.label }))]}
        />
        <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3.5">Recorded</th>
                <th className="px-5 py-3.5">Item</th>
                {showBranch && <th className="px-5 py-3.5">Branch</th>}
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5 text-right">Units</th>
                <th className="px-5 py-3.5 text-right">Value lost</th>
                <th className="px-5 py-3.5">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={showBranch ? 7 : 6} className="px-5 py-10 text-center text-muted-foreground">Loading system losses…</td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={showBranch ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground">
                    <PackageX className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
                    No system losses recorded. Use Record loss on an item in Stock Levels.
                  </td>
                </tr>
              ) : (
                visible.map((l) => (
                  <tr key={l.lossId} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3.5 align-top whitespace-nowrap">
                      <div className="font-medium text-foreground">{when(l.recordedAt)}</div>
                      <div className="text-xs text-muted-foreground">Loss #{l.lossId}</div>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <div className="font-semibold text-foreground">{l.productName}</div>
                      <div className="text-xs text-muted-foreground">{sizeLabel(l.variationName)}</div>
                    </td>
                    {showBranch && <td className="px-5 py-3.5 align-top text-muted-foreground">{l.locationName}</td>}
                    <td className="px-5 py-3.5 align-top">
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        {reasonLabel(l.lossReason)}
                      </span>
                      {l.notes && <p className="m-0 mt-1 max-w-[260px] text-xs text-muted-foreground">{l.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right align-top font-semibold tabular-nums text-destructive">−{l.quantity}</td>
                    <td className="px-5 py-3.5 text-right align-top tabular-nums text-foreground">
                      {l.lossValue == null ? "—" : peso(l.lossValue)}
                      {l.unitPrice != null && <div className="text-xs text-muted-foreground">{peso(l.unitPrice)} each</div>}
                    </td>
                    <td className="px-5 py-3.5 align-top text-muted-foreground">{l.recordedByName || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
