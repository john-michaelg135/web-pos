"use client";

import { useEffect, useState } from "react";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Bone } from "@/components/shared/PageSkeleton";
import { peso } from "@/components/module-pos/SalesReport";
import { OnlineSalesReportBody, centavosToPeso } from "./OnlineSalesReportBody";
import type { OnlineSales } from "@/lib/creoms/online-sales";
import { cn } from "@/lib/utils";

export { centavosToPeso } from "./OnlineSalesReportBody";
const count = (n: number) => n.toLocaleString("en-PH");

type Loaded = { ok: true; data: OnlineSales } | { ok: false; message: string };

const UNAVAILABLE = "Online sales are unavailable right now.";

/**
 * Online storefront sales from CREOMS for Philippine days `from` to `to`, or null while they load.
 * Read once per period; never on a timer.
 */
export function useOnlineSales(from: string, to: string): Loaded | null {
  const requestKey = `${from}|${to}`;
  const [result, setResult] = useState<{ key: string; loaded: Loaded } | null>(null);

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
            : { ok: false, message: response.status === 400 && body?.message ? body.message : UNAVAILABLE },
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, loaded: { ok: false, message: UNAVAILABLE } });
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, requestKey]);

  return result?.key === requestKey ? result.loaded : null;
}

/** Online storefront sales from CREOMS, in full. Company-wide: the storefront has no branch. */
export function OnlineSalesReport({ from, to }: { from: string; to: string }) {
  const loaded = useOnlineSales(from, to);

  if (loaded && !loaded.ok) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-foreground m-0">{loaded.message}</p>
        <p className="text-xs text-muted-foreground mt-1 m-0">The rest of the Sales Report still works. Try again later.</p>
      </div>
    );
  }

  return <OnlineSalesReportBody data={loaded?.data} />;
}

/**
 * The main Sales Report's look at online sales: in-store net sales, online sales and, for all branches, both together.
 * Online sales are company-wide, so they are never added to a single branch's figure.
 */
export function OnlineSalesSummary({ from, to, inStoreNetSales, branchLabel, onOpenDetail }: {
  from: string;
  to: string;
  /** Pesos, or null while the in-store report loads. */
  inStoreNetSales: number | null;
  /** The branch the in-store figure is for, or null for every branch. */
  branchLabel: string | null;
  onOpenDetail: () => void;
}) {
  const loaded = useOnlineSales(from, to);
  const onlinePesos = loaded?.ok ? loaded.data.sales / 100 : null;
  const figures: { label: string; value: string | null; loading: boolean; note: string }[] = [
    { label: "In-store net sales", value: inStoreNetSales === null ? null : peso(inStoreNetSales), loading: inStoreNetSales === null, note: branchLabel ?? "All branches" },
    {
      label: "Online sales",
      value: loaded?.ok ? centavosToPeso(loaded.data.sales) : null,
      loading: !loaded,
      note: loaded?.ok ? `${count(loaded.data.orders)} ${loaded.data.orders === 1 ? "order" : "orders"} · CREOMS storefront` : "CREOMS storefront",
    },
    ...(branchLabel === null
      ? [{
          label: "In-store and online",
          value: inStoreNetSales === null || onlinePesos === null ? null : peso(inStoreNetSales + onlinePesos),
          loading: inStoreNetSales === null || !loaded,
          note: "Both channels together",
        }]
      : []),
  ];

  return (
    <section aria-label="In-store and online sales" className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground m-0">In-store and online sales</h2>
          <p className="text-xs text-muted-foreground mt-1 m-0">
            Online sales are paid or fulfilled CREOMS Orders less refunds, counted on the day the Order was placed. They are kept apart from
            the in-store figures in this report.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onOpenDetail}>
          Online sales by product
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className={cn("grid grid-cols-1 gap-4", figures.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-xl border border-border p-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">{figure.label}</p>
            {figure.loading ? (
              <Bone className="h-8 w-32 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1 m-0">{figure.value ?? "—"}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1 m-0 truncate">{figure.note}</p>
          </div>
        ))}
      </div>
      {loaded && !loaded.ok && <p className="text-xs text-muted-foreground m-0">{loaded.message}</p>}
      {branchLabel !== null && (
        <p className="text-xs text-muted-foreground m-0">The online storefront has no branch, so its sales are not added to {branchLabel}&apos;s.</p>
      )}
    </section>
  );
}
