"use client";

import { Ban, CheckCircle2, Circle, PackageCheck, Send, Truck, XCircle, type LucideIcon } from "lucide-react";

/** A branch's request to IMS for more stock (api-pos StockRequestResponseDto). */
export interface StockRequestRecord {
  requestId: string;
  variationId: number;
  productName: string;
  variationName: string;
  sku: string;
  locationId: number;
  locationName: string;
  quantity: number;
  approvedQuantity: number | null;
  receivedQuantity: number | null;
  notes: string;
  status: StockRequestStatus;
  /** True while IMS hasn't decided (Sending or Submitted). */
  canCancel: boolean;
  remarks: string | null;
  lastSendError: string | null;
  /** IMS refused the submit itself (e.g. an unknown SKU) rather than deciding on the request. */
  refusedOnSubmit: boolean;
  requestedByName: string;
  requestedAt: string;
  sentAt: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  transferId: string | null;
  shippedAt: string | null;
  fulfilledAt: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export type StockRequestStatus =
  | "Sending"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "In Transit"
  | "Fulfilled"
  | "Cancelled";

/** Still in progress. A branch may have several open requests for the same item. */
export const OPEN_STOCK_REQUEST_STATUSES: readonly StockRequestStatus[] = ["Sending", "Submitted", "Approved", "In Transit"];

export const isOpenStockRequest = (request: StockRequestRecord) => OPEN_STOCK_REQUEST_STATUSES.includes(request.status);

/** Units still expected from the open requests: the approved amount once IMS decides, else what was asked. */
export const expectedUnits = (requests: StockRequestRecord[]) =>
  requests.filter(isOpenStockRequest).reduce((sum, r) => sum + (r.approvedQuantity ?? r.quantity), 0);

/** A fresh key for one request form, so a double submit returns the same request instead of a second one. */
export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Key for maps of open requests per item at a branch. */
export const stockRequestKey = (variationId: number | string, locationId: number | string) => `${Number(variationId)}:${Number(locationId)}`;

const BADGE: Record<StockRequestStatus, string> = {
  Sending: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  Submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  Approved: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  "In Transit": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Fulfilled: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-destructive/10 text-destructive",
  Cancelled: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
};

const LABEL: Record<StockRequestStatus, string> = {
  Sending: "Sending",
  Submitted: "IMS reviewing",
  Approved: "Approved",
  "In Transit": "In transit",
  Fulfilled: "Received",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

export const stockRequestStatusLabel = (request: Pick<StockRequestRecord, "status" | "refusedOnSubmit">) =>
  request.status === "Rejected" && request.refusedOnSubmit ? "Refused by IMS" : LABEL[request.status] ?? request.status;

export function StockRequestStatusBadge({ request }: { request: Pick<StockRequestRecord, "status" | "refusedOnSubmit"> }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[request.status] ?? BADGE.Sending}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {stockRequestStatusLabel(request)}
    </span>
  );
}

/** One line on what is happening with the request, in the branch's terms. */
export function describeStockRequest(request: StockRequestRecord): string {
  switch (request.status) {
    case "Sending":
      return request.lastSendError ? "Couldn't reach IMS yet. It will be sent automatically." : "Sending to IMS…";
    case "Submitted":
      return "IMS is reviewing the request.";
    case "Approved":
      return request.approvedQuantity !== null && request.approvedQuantity < request.quantity
        ? `Approved ${request.approvedQuantity} of ${request.quantity}. Waiting for IMS to ship.`
        : `Approved ${request.approvedQuantity ?? request.quantity}. Waiting for IMS to ship.`;
    case "In Transit":
      return "On its way. Receive it under Receive Stock when it arrives.";
    case "Fulfilled":
      return `Received ${request.receivedQuantity ?? 0} unit${request.receivedQuantity === 1 ? "" : "s"}.`;
    case "Rejected":
      return request.refusedOnSubmit
        ? "IMS couldn't accept this request (often an item IMS doesn't recognise)."
        : "IMS won't send this stock.";
    case "Cancelled":
      return "Cancelled by the branch.";
    default:
      return request.status;
  }
}

interface TimelineStep {
  key: string;
  icon: LucideIcon;
  title: string;
  at: string | null;
  detail?: string | null;
  tone: "done" | "current" | "bad" | "muted";
}

/** The request's history as steps; only what happened, plus the next step while it's open. */
export function stockRequestTimeline(request: StockRequestRecord): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      key: "requested",
      icon: Circle,
      title: `Requested ${request.quantity} unit${request.quantity === 1 ? "" : "s"}${request.requestedByName ? ` · ${request.requestedByName}` : ""}`,
      at: request.requestedAt,
      detail: request.notes,
      tone: "done",
    },
  ];

  if (request.sentAt) {
    steps.push({ key: "sent", icon: Send, title: "Sent to IMS", at: request.sentAt, tone: "done" });
  } else if (request.status === "Sending") {
    steps.push({
      key: "sending",
      icon: Send,
      title: request.lastSendError ? "Couldn't reach IMS yet. Retrying automatically" : "Sending to IMS",
      at: null,
      tone: "current",
    });
  }

  if (request.status === "Cancelled") {
    steps.push({
      key: "cancelled",
      icon: Ban,
      title: `Cancelled${request.cancelledByName ? ` · ${request.cancelledByName}` : ""}`,
      at: request.cancelledAt,
      detail: request.cancelReason,
      tone: "muted",
    });
    return steps;
  }

  if (request.status === "Rejected") {
    steps.push({
      key: "rejected",
      icon: XCircle,
      title: request.refusedOnSubmit ? "Refused by IMS" : `Rejected${request.decidedByName ? ` · ${request.decidedByName}` : ""}`,
      at: request.decidedAt,
      detail: request.remarks,
      tone: "bad",
    });
    return steps;
  }

  if (request.status === "Submitted") {
    steps.push({ key: "review", icon: Circle, title: "Waiting for IMS to approve", at: null, tone: "current" });
    return steps;
  }

  if (request.decidedAt || request.approvedQuantity !== null) {
    const partial = request.approvedQuantity !== null && request.approvedQuantity < request.quantity;
    steps.push({
      key: "approved",
      icon: CheckCircle2,
      title: `Approved ${partial ? `${request.approvedQuantity} of ${request.quantity}` : request.approvedQuantity ?? request.quantity}${request.decidedByName ? ` · ${request.decidedByName}` : ""}`,
      at: request.decidedAt,
      detail: request.remarks,
      tone: "done",
    });
  }

  if (request.status === "Approved") {
    steps.push({ key: "ship", icon: Truck, title: "Waiting for IMS to ship", at: null, tone: "current" });
    return steps;
  }

  if (request.transferId || request.shippedAt) {
    steps.push({
      key: "shipped",
      icon: Truck,
      title: `Shipped${request.transferId ? ` · delivery ${request.transferId}` : ""}`,
      at: request.shippedAt,
      tone: "done",
    });
  }

  if (request.status === "In Transit") {
    steps.push({ key: "receive", icon: PackageCheck, title: "Waiting for the branch to receive it", at: null, tone: "current" });
  } else if (request.status === "Fulfilled") {
    steps.push({
      key: "received",
      icon: PackageCheck,
      title: `Received ${request.receivedQuantity ?? 0} unit${request.receivedQuantity === 1 ? "" : "s"}`,
      at: request.fulfilledAt,
      tone: "done",
    });
  }

  return steps;
}

const TONE: Record<TimelineStep["tone"], { dot: string; title: string }> = {
  done: { dot: "bg-primary text-primary-foreground", title: "text-foreground" },
  current: { dot: "border-2 border-dashed border-primary/60 bg-card text-primary", title: "text-muted-foreground" },
  bad: { dot: "bg-destructive text-white", title: "text-destructive" },
  muted: { dot: "bg-zinc-500 text-white", title: "text-foreground" },
};

export function StockRequestTimeline({ request }: { request: StockRequestRecord }) {
  const steps = stockRequestTimeline(request);
  return (
    <ol className="m-0 list-none p-0">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const tone = TONE[step.tone];
        const last = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
            <span className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.dot}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`m-0 text-sm font-semibold ${tone.title}`}>{step.title}</p>
              {step.at && <p className="m-0 mt-0.5 text-xs text-muted-foreground">{formatWhen(step.at)}</p>}
              {step.detail && (
                <p className="m-0 mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
                  {step.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatWhenShort(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Pouch · 250g" from a "SKU|Pouch|250g" variation name, or the name as-is. */
export function stockRequestItemLabel(request: Pick<StockRequestRecord, "productName" | "variationName">) {
  const name = request.variationName?.includes("|")
    ? request.variationName.split("|").slice(1).map((p) => p.trim()).filter(Boolean).join(" · ")
    : request.variationName;
  return [request.productName, name].filter(Boolean).join(" · ");
}
