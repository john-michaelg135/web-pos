"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

import { apiClient } from "@/components/module-pos/api";
import { SearchInput } from "@/components/module-pos/SearchInput";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import type { Product, Variation } from "@/components/module-pos/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** One price a variation has had, with the price it replaced (api-pos PriceChangeDto). */
export interface PriceChange {
  priceId: number;
  productId: number;
  productName: string;
  variationId: number;
  variationName: string;
  price: number;
  previousPrice?: number | null;
  change?: number | null;
  changePercent?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isCurrent: boolean;
  setBy?: number | null;
  setByName?: string | null;
}

const pesoFmt = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const peso = (n: number) => `₱${pesoFmt.format(n)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** "UH-300|Jar|300g" → "Jar · 300g" (falls back to the raw name). */
export function variationLabel(name: string) {
  if (!name.includes("|")) return name;
  const [, ...rest] = name.split("|");
  return rest.map((p) => p.trim()).filter(Boolean).join(" · ") || name;
}

export async function fetchPriceChanges(params: { productId?: number; variationId?: number }) {
  const { data } = await apiClient.instance.get<PriceChange[]>("/api-pos/product-catalog/price-history", { params });
  return Array.isArray(data) ? data : [];
}

function ChangeBadge({ change }: { change: PriceChange }) {
  if (change.change == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        First price
      </span>
    );
  }
  const up = change.change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        up ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : "−"}{peso(Math.abs(change.change))}
      {change.changePercent != null && <span className="font-medium opacity-80">({up ? "+" : "−"}{Math.abs(change.changePercent).toFixed(2)}%)</span>}
    </span>
  );
}

function Period({ change }: { change: PriceChange }) {
  return (
    <div className="text-xs text-muted-foreground">
      <div className="text-sm font-medium text-foreground whitespace-nowrap">{when(change.effectiveFrom)}</div>
      {change.isCurrent ? (
        <span className="font-semibold text-primary">Current price</span>
      ) : change.effectiveTo ? (
        <span>until {when(change.effectiveTo)}</span>
      ) : null}
    </div>
  );
}

/** Every price change across the catalog the viewer can see, newest first. */
export function PriceHistoryTable({ products, changes, isLoading, error }: {
  products: Product[];
  changes: PriceChange[];
  isLoading: boolean;
  error: string | null;
}) {
  const [productFilter, setProductFilter] = useState("all");
  const [direction, setDirection] = useState<"all" | "up" | "down">("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return changes.filter((c) => {
      if (productFilter !== "all" && String(c.productId) !== productFilter) return false;
      if (direction === "up" && !(c.change != null && c.change > 0)) return false;
      if (direction === "down" && !(c.change != null && c.change < 0)) return false;
      if (!terms.length) return true;
      const fields = [
        c.productName, c.variationName, variationLabel(c.variationName),
        when(c.effectiveFrom), c.effectiveTo && when(c.effectiveTo),
        c.isCurrent && "current price", c.change == null && "first price",
        "new price", peso(c.price), c.price,
        c.previousPrice != null && `old price ${peso(c.previousPrice)} ${c.previousPrice}`,
        c.setByName || (c.setBy && `Staff #${c.setBy}`),
      ].filter((value) => value !== false && value != null).join(" ").toLowerCase();
      return terms.every((term) => fields.includes(term));
    });
  }, [changes, productFilter, direction, search]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product, date or price…"
          maxLength={40}
          aria-label="Search price history"
          className="col-span-2 sm:max-w-[240px]"
        />
        <CustomSelect
          value={productFilter}
          onChange={setProductFilter}
          className="w-full sm:w-48"
          options={[{ value: "all", label: "All Products" }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <CustomSelect
          value={direction}
          onChange={(v) => setDirection(v as "all" | "up" | "down")}
          className="w-full sm:w-44"
          options={[
            { value: "all", label: "All changes" },
            { value: "up", label: "Increases" },
            { value: "down", label: "Decreases" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3.5">Effective</th>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Old price</th>
                <th className="px-5 py-3.5">New price</th>
                <th className="px-5 py-3.5">Change</th>
                <th className="px-5 py-3.5">Changed by</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading price history" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-destructive">{error}</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No price changes found.</td>
                </tr>
              ) : (
                visible.map((c) => (
                  <tr key={c.priceId} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3.5 align-top"><Period change={c} /></td>
                    <td className="px-5 py-3.5 align-top">
                      <div className="font-semibold text-foreground">{c.productName}</div>
                      <div className="text-xs text-muted-foreground">{variationLabel(c.variationName)}</div>
                    </td>
                    <td className="px-5 py-3.5 align-top tabular-nums text-muted-foreground">
                      {c.previousPrice == null ? "—" : peso(c.previousPrice)}
                    </td>
                    <td className="px-5 py-3.5 align-top font-semibold tabular-nums text-foreground">{peso(c.price)}</td>
                    <td className="px-5 py-3.5 align-top"><ChangeBadge change={c} /></td>
                    <td className="px-5 py-3.5 align-top text-muted-foreground">{c.setByName || (c.setBy ? `Staff #${c.setBy}` : "—")}</td>
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

/** One variation's price timeline, opened from the pricing table. */
export function PriceHistoryDialog({ variation, productName, onClose }: {
  variation: Variation | null;
  productName?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={variation !== null} onOpenChange={(open) => !open && onClose()}>
      {variation && <PriceTimeline key={variation.id} variation={variation} productName={productName} />}
    </Dialog>
  );
}

/** Mounted fresh for each variation, so it starts out loading. */
function PriceTimeline({ variation, productName }: { variation: Variation; productName?: string }) {
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPriceChanges({ variationId: Number(variation.id) })
      .then((rows) => {
        if (active) setChanges(rows);
      })
      .catch((err) => {
        console.error("Failed to load price history:", err);
        if (active) setError("Could not load the price history.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [variation.id]);

  // Arbitrary width: the theme's --spacing-lg (24px) would turn max-w-lg into a 24px strip.
  return (
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[32rem] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-lg font-bold">
            Price History
          </DialogTitle>
          <DialogDescription>
            {productName ? `${productName} · ` : ""}{variation.packagingType} · {variation.size}
            {variation.sku ? ` (${variation.sku})` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : changes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">This item has no price yet.</p>
          ) : (
            <ol className="relative m-0 list-none space-y-4 border-l border-border pl-5">
              {changes.map((c) => (
                <li key={c.priceId} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background",
                      c.isCurrent ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-bold tabular-nums text-foreground">{peso(c.price)}</span>
                    <ChangeBadge change={c} />
                  </div>
                  {c.previousPrice != null && (
                    <p className="m-0 text-xs text-muted-foreground">was {peso(c.previousPrice)}</p>
                  )}
                  <div className="mt-1"><Period change={c} /></div>
                  {(c.setByName || c.setBy) && (
                    <p className="m-0 mt-0.5 text-xs text-muted-foreground">Set by {c.setByName || `Staff #${c.setBy}`}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
  );
}
