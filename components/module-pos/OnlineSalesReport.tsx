"use client";

import { useEffect, useState } from "react";

import { ReportSkeleton } from "@/components/shared/PageSkeleton";
import { peso } from "@/components/module-pos/SalesReport";
import type { OnlineSales } from "@/lib/creoms/online-sales";
import { cn } from "@/lib/utils";

const TH = "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap";
const TD = "px-5 py-3.5 text-sm align-middle";

/** CREOMS sends centavos. */
export const centavosToPeso = (centavos: number) => peso(centavos / 100);
const count = (n: number) => n.toLocaleString("en-PH");

type Loaded = { ok: true; data: OnlineSales } | { ok: false; message: string };

/**
 * Online storefront sales from CREOMS for Philippine days `from` to `to`. Company-wide: the storefront has no branch.
 * Read once per period; never on a timer.
 */
export function OnlineSalesReport({ from, to }: { from: string; to: string }) {
  const requestKey = `${from}|${to}`;
  const [result, setResult] = useState<{ key: string; loaded: Loaded } | null>(null);
  const isLoading = result?.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/creoms/online-sales?${new URLSearchParams({ from, to })}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        setResult({
          key: requestKey,
          loaded: response.ok
            ? { ok: true, data: body as OnlineSales }
            : { ok: false, message: response.status === 400 && body?.message ? body.message : "Online sales are unavailable right now." },
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, loaded: { ok: false, message: "Online sales are unavailable right now." } });
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, requestKey]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading online sales">
        <ReportSkeleton />
      </div>
    );
  }

  if (!result.loaded.ok) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-foreground m-0">{result.loaded.message}</p>
        <p className="text-xs text-muted-foreground mt-1 m-0">The rest of the Sales Report still works. Try again later.</p>
      </div>
    );
  }

  const data = result.loaded.data;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-primary" />
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">Online storefront</p>
            <p className="text-sm text-muted-foreground mt-1 m-0">
              Paid or fulfilled online Orders, less refunded returns, counted on the day the Order was placed. Separate from in-store sales.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Online sales", value: centavosToPeso(data.sales) },
              { label: "Orders", value: count(data.orders) },
              { label: "Units sold", value: count(data.products.reduce((sum, p) => sum + p.unitsSold, 0)) },
            ].map((figure) => (
              <div key={figure.label} className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">{figure.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1 m-0">{figure.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground m-0">Sales by product</h2>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground m-0 py-6 text-center">No online sales in this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left border-collapse" style={{ minWidth: 560 }}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Product</th>
                  <th className={TH}>Size</th>
                  <th className={cn(TH, "!text-right")}>Units sold</th>
                  <th className={cn(TH, "!text-right")}>Sales</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => (
                  <tr key={`${product.imsProductId ?? "-"}|${product.productName}|${product.sizeLabel}`} className="border-b border-border last:border-0">
                    <td className={cn(TD, "font-medium text-foreground")}>{product.productName}</td>
                    <td className={cn(TD, "text-muted-foreground")}>{product.sizeLabel || "—"}</td>
                    <td className={cn(TD, "text-right tabular-nums")}>{count(product.unitsSold)}</td>
                    <td className={cn(TD, "text-right tabular-nums")}>{centavosToPeso(product.sales)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border last:border-0">
                  <td className={cn(TD, "text-muted-foreground")} colSpan={3}>Delivery fees and adjustments</td>
                  <td className={cn(TD, "text-right tabular-nums text-muted-foreground")}>{centavosToPeso(data.otherSales)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold">
                  <td className={TD} colSpan={3}>Total</td>
                  <td className={cn(TD, "text-right tabular-nums")}>{centavosToPeso(data.sales)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
