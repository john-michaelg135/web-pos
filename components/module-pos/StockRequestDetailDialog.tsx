"use client";

import { useState } from "react";
import { Ban, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  StockRequestStatusBadge,
  StockRequestTimeline,
  describeStockRequest,
  type StockRequestRecord,
} from "@/components/module-pos/StockRequestHistory";

interface StockRequestDetailDialogProps {
  request: StockRequestRecord | null;
  loadingRequestId?: string | null;
  onClose: () => void;
  /** Cancels a request IMS hasn't decided on. Resolves true once IMS confirmed. */
  onConfirmCancel?: (request: StockRequestRecord, reason: string) => Promise<boolean>;
  /** Opens the linked delivery under Receive Stock. */
  onOpenDelivery?: (transferId: string) => void;
}

/**
 * One request's facts and history. Cancelling is a second step inside the same popup (like
 * Receive delivery's confirm step), so no second overlay has to open above this dialog.
 */
export function StockRequestDetailDialog({ request, loadingRequestId, onClose, onConfirmCancel, onOpenDelivery }: StockRequestDetailDialogProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Each request opens on its details with an empty reason (reset while rendering, not in an effect).
  const [appliedId, setAppliedId] = useState<string | null>(null);
  if ((request?.requestId ?? null) !== appliedId) {
    setAppliedId(request?.requestId ?? null);
    setConfirmingCancel(false);
    setReason("");
  }

  const reasonInvalid = /[<>]/.test(reason);
  const canCancel = !!request?.canCancel && !!onConfirmCancel;
  const canOpenDelivery = request?.status === "In Transit" && !!request.transferId && !!onOpenDelivery;
  const partial = request?.approvedQuantity != null && request.approvedQuantity < request.quantity;

  const confirmCancel = async () => {
    if (!request || !onConfirmCancel || reasonInvalid || isCancelling) return;
    setIsCancelling(true);
    try {
      if (await onConfirmCancel(request, reason.trim())) {
        setConfirmingCancel(false);
        setReason("");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={!!request || !!loadingRequestId} onOpenChange={(open) => !open && !isCancelling && onClose()}>
      <DialogContent aria-describedby={undefined} className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[38rem] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:rounded-2xl">
        {loadingRequestId && (
          <DialogHeader className="px-6 py-5 text-left">
            <DialogTitle>Request {loadingRequestId}</DialogTitle>
            <p role="status">Loading request details…</p>
          </DialogHeader>
        )}
        {!loadingRequestId && request && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left sm:px-6">
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <DialogTitle>{confirmingCancel ? `Cancel request ${request.requestId}?` : `Request ${request.requestId}`}</DialogTitle>
                {!confirmingCancel && <StockRequestStatusBadge request={request} />}
              </div>
            </DialogHeader>

            {confirmingCancel ? (
              <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <p className="m-0 text-sm text-foreground">
                  IMS will be told to drop this request for <span className="font-semibold">{request.quantity} unit{request.quantity === 1 ? "" : "s"}</span>.
                  This can&apos;t be undone, but you can send a new request any time.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Reason <span className="text-muted-foreground">(optional)</span></span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={3}
                    disabled={isCancelling}
                    placeholder="e.g. Got stock from another branch instead."
                    className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {reasonInvalid && <span className="block text-xs text-destructive">The reason can&apos;t contain &lt; or &gt;.</span>}
                </label>
              </div>
            ) : (
              <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-5 sm:px-6">
                <p className="m-0 text-sm text-foreground">{describeStockRequest(request)}</p>

                <dl className="m-0 grid grid-cols-3 gap-2">
                  <Fact label="Requested" value={request.quantity} />
                  <Fact label="Approved" value={request.approvedQuantity ?? "—"} highlight={partial} />
                  <Fact label="Received" value={request.receivedQuantity ?? "—"} />
                </dl>

                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 break-words text-xs">
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
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
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

                <div className="border-t border-border pt-4">
                  <h3 className="m-0 mb-3 text-sm font-semibold text-foreground">Request history</h3>
                  <StockRequestTimeline request={request} />
                </div>
              </div>
            )}

            <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3 sm:px-6">
              {confirmingCancel ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setConfirmingCancel(false)} disabled={isCancelling}>
                    Back
                  </Button>
                  <Button type="button" variant="destructive" className="gap-2" onClick={confirmCancel} disabled={reasonInvalid || isCancelling}>
                    <Ban className="h-4 w-4" />
                    {isCancelling ? "Cancelling…" : "Cancel request"}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  {canCancel && (
                    <Button type="button" variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmingCancel(true)}>
                      <Ban className="h-4 w-4" /> Cancel request
                    </Button>
                  )}
                  {canOpenDelivery && (
                    <Button type="button" className="gap-2" onClick={() => onOpenDelivery!(request.transferId!)}>
                      <Truck className="h-4 w-4" /> Receive delivery
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
