"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Boxes, Loader2, MapPin, Package, X } from "lucide-react";
import { StockLevel } from "@/components/module-pos/types";
import { parseVariationName } from "@/components/module-pos/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StockInventoryMovement } from "@/components/module-pos/StockInventoryTable";
import { STOCK_LOSS_REASONS, type StockLossReason } from "@/components/module-pos/StockLossTable";
import {
  StockRequestHistory,
  StockRequestStatusBadge,
  describeStockRequest,
  isOpenStockRequest,
  type StockRequestRecord,
} from "@/components/module-pos/StockRequestHistory";

/** Largest single request IMS accepts (the API enforces the same). */
export const MAX_STOCK_REQUEST_QUANTITY = 10000;

export interface StockLossInput {
  quantity: number;
  lossReason: StockLossReason;
  notes: string;
}

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
  /** Managers: write off unsellable units. Resolves true once recorded. */
  onRecordLoss?: (loss: StockLossInput) => Promise<boolean>;
  /** This item's requests to IMS at this branch, newest first. */
  requests?: StockRequestRecord[];
  isRequestsLoading?: boolean;
  isSubmittingRequest?: boolean;
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
  onRecordLoss,
  requests = [],
  isRequestsLoading = false,
  isSubmittingRequest = false,
}: StockAdjustmentFormDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [movementView, setMovementView] = useState<"today" | "history">("today");
  const [mode, setMode] = useState<"request" | "loss">("request");
  const [lossQuantity, setLossQuantity] = useState("");
  const [lossReason, setLossReason] = useState<StockLossReason>("Expired");
  const [lossNotes, setLossNotes] = useState("");
  const [confirmingLoss, setConfirmingLoss] = useState(false);
  const [isRecordingLoss, setIsRecordingLoss] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Each item opens on the request form with an empty loss form (reset while rendering, not in an effect).
  const formKey = `${isOpen}:${stock?.variationId ?? ""}:${stock?.locationId ?? ""}`;
  const [appliedFormKey, setAppliedFormKey] = useState(formKey);
  if (formKey !== appliedFormKey) {
    setAppliedFormKey(formKey);
    setMode("request");
    setLossQuantity("");
    setLossReason("Expired");
    setLossNotes("");
    setConfirmingLoss(false);
  }

  const onHand = stock?.quantity ?? 0;
  const lossQty = Number(lossQuantity);
  const lossQtyValid = lossQuantity !== "" && Number.isInteger(lossQty) && lossQty >= 1 && lossQty <= onHand;
  const lossNotesValid = lossReason !== "Other" || lossNotes.trim().length > 0;
  const canSubmitLoss = !!onRecordLoss && lossQtyValid && lossNotesValid && !/[<>]/.test(lossNotes) && !isRecordingLoss;

  // Request stock: whole units from 1 to 10000, a note, and no other request still open for this item.
  const openRequest = requests.find(isOpenStockRequest) ?? null;
  const requestQty = Number(quantity);
  const requestQtyValid = quantity !== "" && Number.isInteger(requestQty) && requestQty >= 1 && requestQty <= MAX_STOCK_REQUEST_QUANTITY;
  const requestNotesInvalid = /[<>]/.test(reason);
  const canSubmitRequest = !openRequest && requestQtyValid && reason.trim().length > 0 && !requestNotesInvalid && !isSubmittingRequest && !isRequestsLoading;

  const submitLoss = async () => {
    if (!onRecordLoss || !canSubmitLoss) return;
    setIsRecordingLoss(true);
    try {
      const ok = await onRecordLoss({ quantity: lossQty, lossReason, notes: lossNotes.trim() });
      if (ok) {
        setLossQuantity("");
        setLossNotes("");
        setConfirmingLoss(false);
      }
    } finally {
      setIsRecordingLoss(false);
    }
  };

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
  const { packaging, size } = parseVariationName(stock.variationName ?? "");

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
                  Variation {stock.variationId} · {stock.location}
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
              <p className="m-0 text-lg font-bold text-foreground">{stock.productName || "Product unavailable"}</p>
              {(packaging || size) && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[packaging, size].map((label, index) => label && (
                    <span key={index} className="rounded-md border border-[#e2e6ed] bg-[#eef1f6] px-2 py-0.5 text-xs font-semibold uppercase text-[#4a5568]">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Location
              </div>
              <p className="m-0 truncate text-lg font-bold text-foreground">{stock.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-y-6 xl:grid-cols-3 xl:gap-x-3">
          <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 xl:col-span-2">
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
                            {movement.movementType === "StockLoss" && movement.notes && (
                              <p className="m-0 mt-1 text-xs text-destructive">{movement.notes}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`m-0 text-base font-black tabular-nums ${movement.quantityDelta > 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                            </p>
                            <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                              {movement.movementType === "Loss" ? `Written off · ${movement.quantityAfter} in stock` : `${movement.quantityBefore} → ${movement.quantityAfter}`}
                            </p>
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
            {onRecordLoss && (
              <div className="mb-5 flex items-center rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Action">
                {([
                  { value: "request", label: "Request stock" },
                  { value: "loss", label: "Record loss" },
                ] as const).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.value}
                    onClick={() => { setMode(tab.value); setConfirmingLoss(false); }}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${mode === tab.value ? (tab.value === "loss" ? "bg-card text-destructive shadow-sm" : "bg-card text-primary shadow-sm") : "text-muted-foreground"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {mode === "loss" && onRecordLoss ? (
            <>
            <div className="mb-5">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-destructive">Stock loss</p>
              <h3 className="m-0 mt-1 text-xl font-bold text-foreground">Record a loss</h3>
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                Write off units that can no longer be sold. They come out of this branch&apos;s stock straight away and are kept on record as a stock loss.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <Label htmlFor="loss-quantity">Units lost <span className="text-destructive">*</span></Label>
                <Input
                  id="loss-quantity"
                  type="number"
                  inputMode="numeric"
                  value={lossQuantity}
                  onChange={(e) => { setLossQuantity(e.target.value.replace(/[^0-9]/g, "")); setConfirmingLoss(false); }}
                  placeholder={onHand > 0 ? `1 to ${onHand}` : "No stock to write off"}
                  min={1}
                  max={onHand}
                  disabled={onHand <= 0}
                  className="mt-1.5 h-11"
                />
                <p className={`m-0 mt-1 text-xs ${lossQuantity !== "" && !lossQtyValid ? "text-destructive" : "text-muted-foreground"}`}>
                  {lossQuantity !== "" && !lossQtyValid ? `Enter a whole number from 1 to ${onHand}.` : `${onHand} in stock.`}
                </p>
              </div>
              <fieldset className="m-0 border-0 p-0">
                <legend className="text-sm font-medium">Reason <span className="text-destructive">*</span></legend>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {STOCK_LOSS_REASONS.map((r) => (
                    <label
                      key={r.value}
                      title={r.hint}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${lossReason === r.value ? "border-destructive bg-destructive/5 font-semibold text-destructive" : "border-border text-foreground hover:bg-muted/40"}`}
                    >
                      <input
                        type="radio"
                        name="loss-reason"
                        value={r.value}
                        checked={lossReason === r.value}
                        onChange={() => { setLossReason(r.value); setConfirmingLoss(false); }}
                        className="sr-only"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <p className="m-0 mt-1 text-xs text-muted-foreground">{STOCK_LOSS_REASONS.find((r) => r.value === lossReason)?.hint}</p>
              </fieldset>
              <div>
                <Label htmlFor="loss-notes">
                  What happened {lossReason === "Other" ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
                </Label>
                <Textarea
                  id="loss-notes"
                  placeholder="e.g. Batch expired on the shelf; jar cracked when the box was dropped…"
                  value={lossNotes}
                  onChange={(e) => { setLossNotes(e.target.value); setConfirmingLoss(false); }}
                  maxLength={500}
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>
            </>
            ) : (
            <>
            <div className="mb-5">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-primary">Inventory request</p>
              <h3 className="m-0 mt-1 text-xl font-bold text-foreground">Request stock</h3>
              <p className="m-0 mt-1 text-sm text-muted-foreground">Ask IMS to send more of this item to this branch. IMS approves or rejects it, and an approved request arrives under Receive Stock.</p>
            </div>
            {openRequest ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" role="status">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-sm font-bold text-foreground">Request {openRequest.requestId} is open</p>
                  <StockRequestStatusBadge status={openRequest.status} />
                </div>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {describeStockRequest(openRequest)} You can request this item again once it&apos;s received or rejected.
                </p>
              </div>
            ) : (
            <div className="space-y-5">
              <div>
              <Label htmlFor="request-quantity">Quantity to request <span className="text-destructive">*</span></Label>
              <Input
                id="request-quantity"
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={`1 to ${MAX_STOCK_REQUEST_QUANTITY}`}
                max={MAX_STOCK_REQUEST_QUANTITY}
                min={1}
                step={1}
                className="mt-1.5 h-11"
              />
              {quantity !== "" && !requestQtyValid && (
                <p className="m-0 mt-1 text-xs text-destructive">Enter a whole number from 1 to {MAX_STOCK_REQUEST_QUANTITY}.</p>
              )}
              </div>
              <div>
              <Label htmlFor="request-notes">Notes for IMS <span className="text-destructive">*</span></Label>
              <Textarea
                id="request-notes"
                placeholder="Why is the stock needed? e.g. Weekend bazaar, expecting double the usual sales."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={5}
                className="mt-1.5 resize-none"
              />
              {requestNotesInvalid && (
                <p className="m-0 mt-1 text-xs text-destructive">Notes cannot contain &lt; or &gt;.</p>
              )}
              </div>
            </div>
            )}
            <div className="mt-6">
              <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Requests for this item</p>
              <StockRequestHistory requests={requests} isLoading={isRequestsLoading} />
            </div>
            </>
            )}
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
          <Button variant="outline" onClick={onClose} disabled={isRecordingLoss || isSubmittingRequest}>Cancel</Button>
          {mode === "loss" && onRecordLoss ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmingLoss(true)}
              disabled={!canSubmitLoss}
            >
              Record loss
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={!canSubmitRequest}
            >
              {isSubmittingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmittingRequest ? "Sending to IMS…" : "Request Stock"}
            </Button>
          )}
        </div>
      </div>

      {/* Write-off confirmation: a popup over the inventory dialog. */}
      {confirmingLoss && lossQtyValid && (
        <>
          <div
            onClick={() => !isRecordingLoss && setConfirmingLoss(false)}
            style={{ position: "fixed", inset: 0, zIndex: 100000, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-loss-title"
            aria-describedby="confirm-loss-body"
            onKeyDown={(e) => e.key === "Escape" && !isRecordingLoss && setConfirmingLoss(false)}
            className="rounded-2xl border border-border bg-card text-foreground shadow-2xl"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100001,
              width: "min(440px, calc(100vw - 32px))",
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
            }}
          >
            <div className="px-6 pt-6">
              <h2 id="confirm-loss-title" className="m-0 text-lg font-bold">
                Write off {lossQty} unit{lossQty === 1 ? "" : "s"}?
              </h2>
              <p id="confirm-loss-body" className="m-0 mt-1 text-sm text-muted-foreground">
                They come out of stock straight away and are kept on record as a stock loss. This can&apos;t be undone from here.
              </p>
            </div>
            <dl className="mx-6 mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <dt className="text-muted-foreground">Item</dt>
              <dd className="m-0 min-w-0 truncate font-medium">{stock.variationName || `Variation ${stock.variationId}`}</dd>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="m-0 min-w-0 truncate font-medium">{stock.location}</dd>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="m-0 font-medium">{STOCK_LOSS_REASONS.find((r) => r.value === lossReason)?.label ?? lossReason}</dd>
              {lossNotes.trim() && (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="m-0 min-w-0 break-words">{lossNotes.trim()}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Stock</dt>
              <dd className="m-0 font-semibold tabular-nums">
                {onHand} → <span className="text-destructive">{onHand - lossQty}</span>
              </dd>
            </dl>
            <div className="flex justify-end gap-2 px-6 py-5">
              <Button variant="outline" onClick={() => setConfirmingLoss(false)} disabled={isRecordingLoss} autoFocus>
                Cancel
              </Button>
              <Button variant="destructive" onClick={submitLoss} disabled={!canSubmitLoss}>
                {isRecordingLoss ? "Confirming…" : "Confirm"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );

  return createPortal(modal, document.body);
}

function formatMovementType(value: string) {
  if (value === "Loss") return "Stock loss";
  if (value === "StockLoss") return "Stock loss (written off)";
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
