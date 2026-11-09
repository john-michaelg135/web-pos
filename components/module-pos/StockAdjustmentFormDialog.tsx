"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Boxes, MapPin, Package, X } from "lucide-react";
import { StockLevel } from "@/components/module-pos/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StockInventoryMovement } from "@/components/module-pos/StockInventoryTable";

interface StockAdjustmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockLevel | null;
  quantity: string;
  setQuantity: (qty: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  onSubmit: () => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;
  isMobile?: boolean;
  movements?: StockInventoryMovement[];
  isMovementsLoading?: boolean;
}

export default function StockAdjustmentFormDialog({
  isOpen,
  onClose,
  stock,
  quantity,
  setQuantity,
  reason,
  setReason,
  onSubmit,
  movements = [],
  isMovementsLoading = false,
}: StockAdjustmentFormDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [movementView, setMovementView] = useState<"today" | "history">("today");

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleMovements = useMemo(() => {
    if (movementView === "history") return movements;

    const today = new Date();
    return movements.filter((movement) => {
      const occurredAt = new Date(movement.occurredAt);
      return occurredAt.getFullYear() === today.getFullYear() &&
        occurredAt.getMonth() === today.getMonth() &&
        occurredAt.getDate() === today.getDate();
    });
  }, [movementView, movements]);

  const groupedMovements = useMemo(() => {
    return visibleMovements.reduce<Record<string, StockInventoryMovement[]>>((groups, movement) => {
      const dateKey = formatDateGroup(movement.occurredAt);
      groups[dateKey] = groups[dateKey] ?? [];
      groups[dateKey].push(movement);
      return groups;
    }, {});
  }, [visibleMovements]);

  if (!isOpen || !stock || !mounted) return null;

  const modal = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      />
      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "calc(100% - 32px)",
          maxWidth: 1100,
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-5 sm:px-8">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="m-0 truncate text-xl font-bold tracking-tight text-foreground">Stock Inventory</h2>
                <p className="m-0 mt-1 truncate text-sm text-muted-foreground">
                  {stock.variationName || `Variation ${stock.variationId}`} · {stock.location}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: "#71717a" }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto bg-muted/10 p-5 sm:p-8" style={{ flex: 1 }}>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Boxes className="h-4 w-4 text-primary" /> Current stock
              </div>
              <p className="m-0 text-2xl font-black tabular-nums text-foreground">{stock.quantity}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Package className="h-4 w-4 text-primary" /> Variation
              </div>
              <p className="m-0 truncate text-lg font-bold text-foreground">{stock.variationName || stock.variationId}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Location
              </div>
              <p className="m-0 truncate text-lg font-bold text-foreground">{stock.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-primary">Activity ledger</p>
                <h3 className="m-0 mt-1 text-xl font-bold text-foreground">Movement history</h3>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Every receipt, sale, refund, and adjustment.</p>
              </div>
              <div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setMovementView("today")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${movementView === "today" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMovementView("history")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${movementView === "history" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                History
              </button>
              </div>
            </div>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{movementView === "today" ? "Changes recorded today" : "Complete movement history"}</span>
              <span className="font-semibold text-foreground">{visibleMovements.length} {visibleMovements.length === 1 ? "record" : "records"}</span>
            </div>
            {isMovementsLoading ? (
              <p className="m-0 py-8 text-center text-sm text-muted-foreground">Loading movement history...</p>
            ) : visibleMovements.length === 0 ? (
              <p className="m-0 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {movementView === "today" ? "No stock changes recorded today." : "No movement history recorded yet."}
              </p>
            ) : (
              <div className="max-h-[520px] w-full overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
              {Object.entries(groupedMovements).map(([date, dateMovements]) => (
                <div key={date}>
                  {movementView === "history" && (
                    <div className="sticky top-0 z-10 border-b border-border bg-muted/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
                      {date}
                    </div>
                  )}
                  {dateMovements.map((movement) => (
                    <div key={movement.stockMovementId} className="flex gap-3 border-b border-border bg-card px-4 py-4 last:border-0 hover:bg-muted/30">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${movement.quantityDelta > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                        {movement.quantityDelta > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="m-0 truncate text-sm font-bold text-foreground">{formatMovementType(movement.movementType)}</p>
                            <p className="m-0 mt-1 truncate text-xs text-muted-foreground">
                              {formatDate(movement.occurredAt)}{movement.reference ? ` · ${movement.reference}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`m-0 text-base font-black tabular-nums ${movement.quantityDelta > 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                            </p>
                            <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">{movement.quantityBefore} → {movement.quantityAfter}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 xl:sticky xl:top-0">
            <div className="mb-5">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-primary">Inventory request</p>
              <h3 className="m-0 mt-1 text-xl font-bold text-foreground">Request stock</h3>
              <p className="m-0 mt-1 text-sm text-muted-foreground">Submit a quantity request for this branch.</p>
            </div>
            <div className="space-y-5">
              <div>
              <Label>Quantity to Request <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                max={10000}
                min={-10000}
                className="mt-1.5 h-11"
              />
              </div>
              <div>
              <Label>Request Details <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Please specify what stock is needed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={7}
                className="mt-1.5 resize-none"
              />
              </div>
            </div>
          </section>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e4e4e7",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "#fafafa",
            borderRadius: "0 0 12px 12px",
            flexShrink: 0,
          }}
        >
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={!reason.trim() || !quantity || isNaN(Number(quantity))}
          >
            Request Stock
          </Button>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function formatMovementType(value: string) {
  if (value === "Loss") return "System loss";
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDateGroup(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
