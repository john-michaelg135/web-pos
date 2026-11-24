"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { stockRequestItemLabel, type StockRequestRecord } from "@/components/module-pos/StockRequestHistory";

interface CancelStockRequestDialogProps {
  /** The request to cancel; null closes the dialog. */
  request: StockRequestRecord | null;
  onClose: () => void;
  /** Resolves true once IMS confirmed the cancel. */
  onConfirm: (request: StockRequestRecord, reason: string) => Promise<boolean>;
}

/**
 * Confirms withdrawing a request IMS hasn't decided on. Rendered in a portal above everything,
 * including the Stock Inventory modal, so it can be opened from there or from the Requests tab.
 */
export function CancelStockRequestDialog({ request, onClose, onConfirm }: CancelStockRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  // A new request opens with an empty reason (reset while rendering, not in an effect).
  const [appliedId, setAppliedId] = useState<string | null>(null);
  if ((request?.requestId ?? null) !== appliedId) {
    setAppliedId(request?.requestId ?? null);
    setReason("");
  }

  if (!request || typeof document === "undefined") return null;

  const invalid = /[<>]/.test(reason);
  const close = () => { if (!isCancelling) onClose(); };
  const confirm = async () => {
    if (invalid || isCancelling) return;
    setIsCancelling(true);
    try {
      if (await onConfirm(request, reason.trim())) onClose();
    } finally {
      setIsCancelling(false);
    }
  };

  return createPortal(
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 100000, backgroundColor: "rgba(0, 0, 0, 0.5)" }} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-request-title"
        aria-describedby="cancel-request-body"
        onKeyDown={(e) => e.key === "Escape" && close()}
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
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Ban className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="cancel-request-title" className="m-0 text-lg font-bold">Cancel request {request.requestId}?</h2>
            <p id="cancel-request-body" className="m-0 mt-1 text-sm text-muted-foreground">
              IMS will be told to drop it. This can&apos;t be undone, but you can send a new request any time.
            </p>
          </div>
        </div>
        <dl className="mx-6 mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <dt className="text-muted-foreground">Item</dt>
          <dd className="m-0 min-w-0 truncate font-medium">{stockRequestItemLabel(request)}</dd>
          <dt className="text-muted-foreground">Quantity</dt>
          <dd className="m-0 font-medium tabular-nums">{request.quantity}</dd>
          {request.locationName && (
            <>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="m-0 min-w-0 truncate font-medium">{request.locationName}</dd>
            </>
          )}
        </dl>
        <div className="mx-6 mt-4">
          <Label htmlFor="cancel-reason">Reason <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Got stock from another branch instead."
            maxLength={500}
            rows={3}
            className="mt-1.5 resize-none"
            disabled={isCancelling}
          />
          {invalid && <p className="m-0 mt-1 text-xs text-destructive">The reason cannot contain &lt; or &gt;.</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-5">
          <Button variant="outline" onClick={close} disabled={isCancelling} autoFocus>Keep request</Button>
          <Button variant="destructive" onClick={confirm} disabled={invalid || isCancelling}>
            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
            {isCancelling ? "Cancelling…" : "Cancel request"}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
