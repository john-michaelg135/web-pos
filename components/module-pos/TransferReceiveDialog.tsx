"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { apiClient } from "@/components/module-pos/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface PendingTransferLine {
  lineId: number;
  sku: string | null;
  productName: string;
  expectedQuantity: number;
  variationId: number | null;
  variationName: string | null;
  posProductName: string | null;
}

export interface PendingTransfer {
  transferId: string;
  sourceLocationName: string;
  destinationLocationId: number;
  destinationLocationName: string;
  transferDate: string;
  status: string;
  lines: PendingTransferLine[];
}

interface LineCount {
  received: string;
  damaged: string;
  reason: string;
}

const toCount = (value: string) => (value.trim() === "" ? NaN : Number(value));

/** Problem with one line's count, or null when it can be submitted. */
function lineProblem(line: PendingTransferLine, count: LineCount): string | null {
  const received = toCount(count.received);
  const damaged = toCount(count.damaged);
  if (!Number.isInteger(received) || received < 0) return "Enter the units received (0 or more).";
  if (!Number.isInteger(damaged) || damaged < 0) return "Enter the damaged units (0 or more).";
  if (received + damaged > line.expectedQuantity) return `Received plus damaged can't be more than the ${line.expectedQuantity} sent.`;
  if (received !== line.expectedQuantity && !count.reason.trim()) return "Give a reason for the units not received.";
  return null;
}

/**
 * Counts an SCMS delivery in: received and damaged units per line, then a confirm step.
 * Only received units go into stock; SCMS is told all three numbers.
 */
export function TransferReceiveDialog({
  transfer,
  onClose,
  onReceived,
}: {
  transfer: PendingTransfer | null;
  onClose: () => void;
  onReceived: () => void;
}) {
  // Reset the form whenever a different delivery opens.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<number, LineCount>>({});
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (transfer && transfer.transferId !== openedFor) {
    setOpenedFor(transfer.transferId);
    setCounts(Object.fromEntries(transfer.lines.map((l) => [l.lineId, { received: String(l.expectedQuantity), damaged: "0", reason: "" }])));
    setNotes("");
    setConfirming(false);
  }

  const lines = transfer?.lines ?? [];
  const countFor = (lineId: number): LineCount => counts[lineId] ?? { received: "", damaged: "", reason: "" };
  const setCount = (lineId: number, patch: Partial<LineCount>) =>
    setCounts((prev) => ({ ...prev, [lineId]: { ...countFor(lineId), ...patch } }));

  const unmatched = lines.filter((l) => l.variationId == null);
  const problems = lines.map((l) => lineProblem(l, countFor(l.lineId)));
  const canSubmit = lines.length > 0 && unmatched.length === 0 && problems.every((p) => p === null) && !/[<>]/.test(notes);

  const totals = lines.reduce(
    (sum, l) => {
      const c = countFor(l.lineId);
      return {
        expected: sum.expected + l.expectedQuantity,
        received: sum.received + (toCount(c.received) || 0),
        damaged: sum.damaged + (toCount(c.damaged) || 0),
      };
    },
    { expected: 0, received: 0, damaged: 0 }
  );

  const submit = async () => {
    if (!transfer) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.instance.post(`/api-pos/transfers/${encodeURIComponent(transfer.transferId)}/receive`, {
        notes: notes.trim() || null,
        lines: lines.map((l) => {
          const c = countFor(l.lineId);
          return {
            lineId: l.lineId,
            receivedQuantity: toCount(c.received),
            damagedQuantity: toCount(c.damaged),
            discrepancyReason: c.reason.trim() || null,
          };
        }),
      });
      toast.success(data?.message ?? "Delivery received.");
      onReceived();
      onClose();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Couldn't receive this delivery. Try again.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full h-9 px-2.5 text-sm text-right tabular-nums bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={!!transfer} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[44rem] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{confirming ? "Confirm receipt" : "Receive delivery"}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{transfer?.transferId}</span> to {transfer?.destinationLocationName}
            {transfer?.sourceLocationName ? `, from ${transfer.sourceLocationName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground m-0">
              Add <span className="font-semibold">{totals.received} units</span> to {transfer?.destinationLocationName}&apos;s stock?
              {totals.damaged > 0 && <> {totals.damaged} damaged units will be reported to SCMS and not added.</>}
              {totals.received + totals.damaged < totals.expected && (
                <> {totals.expected - totals.received - totals.damaged} units will be reported missing.</>
              )}
            </p>
            <ul className="m-0 p-0 list-none divide-y divide-border rounded-xl border border-border">
              {lines.map((l) => {
                const c = countFor(l.lineId);
                return (
                  <li key={l.lineId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{l.posProductName ?? l.productName}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {c.received} of {l.expectedQuantity}
                      {toCount(c.damaged) > 0 && <span className="text-error-600 dark:text-error-400"> · {c.damaged} damaged</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground m-0">This can&apos;t be undone. Fix any later mistake with a stock adjustment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unmatched.length > 0 && (
              <p className="text-sm m-0 rounded-xl border border-error-200 dark:border-error-900/40 bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400 px-3.5 py-2.5">
                {unmatched.length === 1 ? "1 item isn't" : `${unmatched.length} items aren't`} in the POS catalog yet. Ask SCMS to sync
                the product, then refresh.
              </p>
            )}

            <ul className="m-0 p-0 list-none space-y-2.5">
              {lines.map((l, i) => {
                const c = countFor(l.lineId);
                const problem = problems[i];
                const short = toCount(c.received) !== l.expectedQuantity;
                return (
                  <li key={l.lineId} className="rounded-xl border border-border p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground m-0">{l.posProductName ?? l.productName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                          {l.sku && <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">{l.sku}</code>}
                          {l.variationId == null ? (
                            <span className="font-semibold text-error-600 dark:text-error-400">Not in POS catalog</span>
                          ) : (
                            l.variationName && <span>{l.variationName.split("|").slice(1).join(" · ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold tabular-nums text-foreground m-0 leading-none">{l.expectedQuantity}</p>
                        <p className="text-[11px] text-muted-foreground m-0 mt-1">sent</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Received (good)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={l.expectedQuantity}
                          value={c.received}
                          disabled={l.variationId == null}
                          onChange={(e) => setCount(l.lineId, { received: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Damaged</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={l.expectedQuantity}
                          value={c.damaged}
                          disabled={l.variationId == null}
                          onChange={(e) => setCount(l.lineId, { damaged: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    {short && l.variationId != null && (
                      <input
                        type="text"
                        value={c.reason}
                        maxLength={300}
                        onChange={(e) => setCount(l.lineId, { reason: e.target.value })}
                        placeholder="Reason, e.g. 2 tubs arrived with broken seals"
                        className="w-full h-9 px-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    {problem && l.variationId != null && <p className="text-xs text-error-600 dark:text-error-400 m-0">{problem}</p>}
                  </li>
                );
              })}
            </ul>

            <label className="block space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</span>
              <textarea
                value={notes}
                maxLength={500}
                rows={2}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received by Shift A"
                className="w-full px-2.5 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {/[<>]/.test(notes) && <span className="block text-xs text-error-600 dark:text-error-400">Notes can&apos;t contain &lt; or &gt;.</span>}
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          {confirming ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
                Back
              </Button>
              <Button type="button" className="gap-2" onClick={submit} disabled={submitting}>
                <PackageCheck className="h-4 w-4" />
                {submitting ? "Receiving…" : "Confirm receipt"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setConfirming(true)} disabled={!canSubmit}>
                Continue
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
