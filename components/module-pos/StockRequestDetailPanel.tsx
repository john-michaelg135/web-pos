"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Ban, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StockRequestStatusBadge,
  StockRequestTimeline,
  describeStockRequest,
  stockRequestItemLabel,
  type StockRequestRecord,
} from "@/components/module-pos/StockRequestHistory";

interface StockRequestDetailPanelProps {
  request: StockRequestRecord | null;
  onClose: () => void;
  /** Opens the cancel confirmation; shown only while the request can still be cancelled. */
  onCancel?: (request: StockRequestRecord) => void;
  /** Opens the linked delivery under Receive Stock. */
  onOpenDelivery?: (transferId: string) => void;
}

/**
 * One request's facts and history, in a panel that slides in from the right. A plain portal
 * (not a focus-trapping dialog) so the cancel confirmation can open on top of it.
 */
export function StockRequestDetailPanel({ request, onClose, onCancel, onOpenDelivery }: StockRequestDetailPanelProps) {
  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      // The cancel confirmation handles its own Escape; only close when nothing sits above the panel.
      if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, onClose]);

  if (!request || typeof document === "undefined") return null;

  const partial = request.approvedQuantity !== null && request.approvedQuantity < request.quantity;

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99990, backgroundColor: "rgba(0, 0, 0, 0.45)" }} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-panel-title"
        className="flex flex-col border-l border-border bg-card text-foreground shadow-2xl"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 99991, width: "min(460px, 100vw)" }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="request-panel-title" className="m-0 text-lg font-bold">{request.requestId}</h2>
              <StockRequestStatusBadge request={request} />
            </div>
            <p className="m-0 mt-1 truncate text-sm text-muted-foreground">
              {stockRequestItemLabel(request)}{request.locationName ? ` · ${request.locationName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="m-0 text-sm text-foreground">{describeStockRequest(request)}</p>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            <Fact label="Requested" value={request.quantity} />
            <Fact label="Approved" value={request.approvedQuantity ?? "—"} highlight={partial} />
            <Fact label="Received" value={request.receivedQuantity ?? "—"} />
          </dl>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">SKU</dt>
            <dd className="m-0 font-mono">{request.sku}</dd>
            {request.transferId && (
              <>
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="m-0 font-mono">{request.transferId}</dd>
              </>
            )}
          </dl>

          {request.status === "Rejected" && request.remarks && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-destructive">
                {request.refusedOnSubmit ? "IMS couldn't accept it" : "IMS's reason"}
              </p>
              <p className="m-0 mt-1 break-words text-foreground">{request.remarks}</p>
              {request.refusedOnSubmit && (
                <p className="m-0 mt-2 text-xs text-muted-foreground">
                  Check that this item&apos;s SKU matches IMS before requesting it again.
                </p>
              )}
            </div>
          )}

          <h3 className="m-0 mt-6 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">History</h3>
          <StockRequestTimeline request={request} />
        </div>

        {(request.canCancel && onCancel) || (request.status === "In Transit" && request.transferId && onOpenDelivery) ? (
          <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
            {request.status === "In Transit" && request.transferId && onOpenDelivery && (
              <Button onClick={() => onOpenDelivery(request.transferId!)}>
                <Truck className="mr-2 h-4 w-4" /> Receive delivery
              </Button>
            )}
            {request.canCancel && onCancel && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => onCancel(request)}>
                <Ban className="mr-2 h-4 w-4" /> Cancel request
              </Button>
            )}
          </footer>
        ) : null}
      </aside>
    </>,
    document.body,
  );
}

function Fact({ label, value, highlight = false }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`m-0 mt-0.5 text-xl font-black tabular-nums ${highlight ? "text-purple-700 dark:text-purple-300" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}
