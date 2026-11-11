"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StockInventoryMovement {
  stockMovementId: number;
  variationId: number;
  variationName: string;
  productName: string;
  locationId: number;
  locationName: string;
  quantityDelta: number;
  movementType: string;
  reference?: string | null;
  notes?: string | null;
  orderId?: number | null;
  occurredAt: string;
  quantityBefore: number;
  quantityAfter: number;
}

interface StockInventoryTableProps {
  movements: StockInventoryMovement[];
  selectedLocation: string;
  isLoading?: boolean;
}

const typeLabel: Record<string, string> = {
  Receipt: "Addition",
  Sale: "Sale deduction",
  Refund: "Refund return",
  Loss: "System loss",
  Adjustment: "Adjustment",
};

export function StockInventoryTable({
  movements,
  selectedLocation,
  isLoading = false,
}: StockInventoryTableProps) {
  const visible = useMemo(
    () =>
      movements.filter(
        (movement) =>
          selectedLocation === "All" ||
          movement.locationName === selectedLocation,
      ),
    [movements, selectedLocation],
  );

  if (isLoading) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading stock inventory...</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h3 className="text-lg font-bold text-foreground">Stock Inventory</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Every addition and deduction by branch, including sales and approved adjustments.
        </p>
      </div>

      <div className="md:hidden">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((movement) => (
              <li key={`${movement.stockMovementId}-${movement.variationId}`} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{movement.productName}</p>
                    <p className="text-xs text-muted-foreground">{movement.variationName} · {movement.locationName}</p>
                  </div>
                  <Delta movement={movement} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{formatDate(movement.occurredAt)}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-1 font-bold uppercase text-primary">
                    {typeLabel[movement.movementType] ?? movement.movementType}
                  </span>
                  <span>Balance: {movement.quantityAfter}</span>
                </div>
                {(movement.reference || movement.notes) && (
                  <p className="m-0 text-xs text-muted-foreground">
                    {movement.reference ?? movement.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Date", "Branch", "Product", "Movement", "Qty", "Balance", "Reference"].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">No stock movements recorded yet.</td></tr>
            ) : visible.map((movement) => (
              <tr key={`${movement.stockMovementId}-${movement.variationId}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{formatDate(movement.occurredAt)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-foreground">{movement.locationName}</td>
                <td className="px-4 py-4">
                  <p className="m-0 text-sm font-semibold text-foreground">{movement.productName}</p>
                  <p className="m-0 text-xs text-muted-foreground">{movement.variationName}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                    {typeLabel[movement.movementType] ?? movement.movementType}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4"><Delta movement={movement} /></td>
                <td className="whitespace-nowrap px-4 py-4 text-sm font-bold tabular-nums text-foreground">
                  {movement.movementType === "Loss" ? `Written off · ${movement.quantityAfter} in stock` : `${movement.quantityBefore} → ${movement.quantityAfter}`}
                </td>
                <td className="max-w-[220px] px-4 py-4 text-xs text-muted-foreground">
                  {movement.reference ?? movement.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Delta({ movement }: { movement: StockInventoryMovement }) {
  const addition = movement.quantityDelta > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-bold tabular-nums", addition ? "text-emerald-600" : "text-destructive")}>
      {addition ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {addition ? "+" : ""}{movement.quantityDelta}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
