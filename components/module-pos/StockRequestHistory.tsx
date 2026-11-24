"use client";

/** A branch's request to IMS for more stock (api-pos StockRequestResponseDto). */
export interface StockRequestRecord {
  requestId: string;
  variationId: number;
  variationName: string;
  productName: string;
  sku: string;
  locationId: number;
  locationName: string;
  quantity: number;
  approvedQuantity: number | null;
  receivedQuantity: number | null;
  notes: string;
  status: StockRequestStatus;
  remarks: string | null;
  lastSendError: string | null;
  requestedByName: string;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  transferId: string | null;
  fulfilledAt: string | null;
}

export type StockRequestStatus =
  | "Sending"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "In Transit"
  | "Fulfilled"
  | "Cancelled";

/** Statuses that block a new request for the same item at the same branch (the API enforces it too). */
export const OPEN_STOCK_REQUEST_STATUSES: readonly StockRequestStatus[] = ["Sending", "Submitted", "Approved", "In Transit"];

export const isOpenStockRequest = (request: StockRequestRecord) => OPEN_STOCK_REQUEST_STATUSES.includes(request.status);

const BADGE: Record<StockRequestStatus, string> = {
  Sending: "bg-zinc-500/10 text-zinc-600",
  Submitted: "bg-blue-500/10 text-blue-600",
  Approved: "bg-purple-500/10 text-purple-700",
  "In Transit": "bg-amber-500/10 text-amber-700",
  Fulfilled: "bg-emerald-500/10 text-emerald-700",
  Rejected: "bg-destructive/10 text-destructive",
  Cancelled: "bg-zinc-500/10 text-zinc-600",
};

export function StockRequestStatusBadge({ status }: { status: StockRequestStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[status] ?? BADGE.Sending}`}>
      {status}
    </span>
  );
}

/** One line on what is happening with the request, in the branch's terms. */
export function describeStockRequest(request: StockRequestRecord): string {
  switch (request.status) {
    case "Sending":
      return request.lastSendError
        ? "Couldn't reach IMS yet. It will be sent automatically."
        : "Sending to IMS…";
    case "Submitted":
      return "IMS is reviewing the request.";
    case "Approved":
      return request.approvedQuantity !== null && request.approvedQuantity < request.quantity
        ? `Approved · ${request.approvedQuantity} of ${request.quantity}. Waiting for IMS to ship.`
        : `Approved · ${request.approvedQuantity ?? request.quantity} units. Waiting for IMS to ship.`;
    case "In Transit":
      return `On its way${request.transferId ? ` (delivery ${request.transferId})` : ""}. Receive it under Receive Stock.`;
    case "Fulfilled":
      return `Received ${request.receivedQuantity ?? 0} unit${request.receivedQuantity === 1 ? "" : "s"}.`;
    case "Rejected":
      return "IMS won't send this stock.";
    case "Cancelled":
      return "Withdrawn by the branch.";
    default:
      return request.status;
  }
}

interface StockRequestHistoryProps {
  requests: StockRequestRecord[];
  isLoading?: boolean;
}

export function StockRequestHistory({ requests, isLoading = false }: StockRequestHistoryProps) {
  if (isLoading && requests.length === 0) {
    return <p className="m-0 py-4 text-center text-sm text-muted-foreground">Loading requests…</p>;
  }
  if (requests.length === 0) {
    return <p className="m-0 rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">No requests for this item yet.</p>;
  }

  return (
    <ul className="m-0 max-h-[280px] list-none space-y-2 overflow-y-auto p-0 pr-1">
      {requests.map((request) => (
        <li key={request.requestId} className="rounded-xl border border-border bg-card px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold tabular-nums text-foreground">
              {request.quantity} unit{request.quantity === 1 ? "" : "s"}
              <span className="ml-2 text-xs font-medium text-muted-foreground">{request.requestId}</span>
            </span>
            <StockRequestStatusBadge status={request.status} />
          </div>
          <p className="m-0 mt-1 text-xs text-foreground">{describeStockRequest(request)}</p>
          {request.remarks && (
            <p className={`m-0 mt-1 text-xs ${request.status === "Rejected" ? "text-destructive" : "text-muted-foreground"}`}>
              IMS: {request.remarks}
            </p>
          )}
          <p className="m-0 mt-1 text-[11px] text-muted-foreground">
            {formatWhen(request.requestedAt)} by {request.requestedByName || "staff"}
            {request.decidedAt && ` · decided ${formatWhen(request.decidedAt)}${request.decidedByName ? ` by ${request.decidedByName}` : ""}`}
            {request.fulfilledAt && ` · received ${formatWhen(request.fulfilledAt)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
