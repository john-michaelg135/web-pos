export type OrderStatus =
  | "pending"
  | "awaiting_stock"
  | "processing"
  | "paid"
  | "ready_for_delivery"
  | "shipped"
  | "delivered"
  | "completed"
  | "rejected"
  | "cancelled"
  | "refund_requested"
  | "refunded"
  | "void_requested"
  | "voided";

export type OrderStatusHistory = {
  id: number;
  orderId: number;
  oldStatus: string;
  newStatus: string;
  changedBy?: number | null;
  /** Name of the staff member behind changedBy, when known. */
  changedByName?: string | null;
  remarks?: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  /** Human-readable order number (e.g. ORD-20260911-0002). Falls back to `#<id>` when unavailable. */
  orderNumber?: string;
  type: "walk-in" | "store" | "online" | "institutional";
  customer: string;
  items: {
    /** Missing only on the placeholder line shown when an order came back without items. */
    variationId?: number;
    name: string;
    variation: string;
    quantity: number;
    price: number;
    /** Units already refunded. */
    refundedQuantity?: number;
    /** Units in a refund request awaiting a manager. */
    pendingRefundQuantity?: number;
  }[];
  total: number;
  status: OrderStatus;
  date: string;
  location: string;
  /** Numeric branch id — used for reliable location filtering (name can drift). */
  locationId?: number;
  isPreOrder: boolean;
  /** "forfeited": a cancelled downpayment order whose downpayment was kept (non-refundable). */
  paymentStatus: "pending" | "partial" | "paid" | "forfeited";
  paymentMethod?: string;
  /** Sum of successful payments recorded against the order. */
  amountPaid?: number;
  remarks?: string;
  paymentUrl?: string | null;
  source?: string;
  deliveryAddress?: string;
  amountTendered?: number;
  changeAmount?: number;
  customVariationNotes?: string;
  seniorPwdId?: string;
  seniorPwdName?: string;
  seniorPwdStreet?: string;
  seniorPwdBarangay?: string;
  seniorPwdCity?: string;
  seniorPwdProvince?: string;
  seniorPwdZipCode?: string;
  statusHistory?: OrderStatusHistory[];
  /** ISO timestamp the order was placed (`date` is display-only). */
  createdAt?: string;
  deliveryConfirmation?: DeliveryConfirmation | null;
  /** A refund request photo exists (fetched separately). */
  hasRefundProof?: boolean;
  /** Value of the items already refunded. */
  refundedAmount?: number;
  /** Value of the items in a refund request awaiting a manager. */
  pendingRefundAmount?: number;
  /** The signed-in user filed the waiting refund or void request, so they can't approve it. */
  requestedByCurrentUser?: boolean;
  /** How a refund is paid out: the way the order was paid. */
  refundMethod?: "Cash" | "GCash";
  /** ISO time the refund window closes (exclusive); set by the server's RefundPolicy. */
  refundDeadline?: string | null;
};

/** Institutional proof of delivery. The photo is fetched separately when `hasProofImage`. */
export type DeliveryConfirmation = {
  receivedBy: string;
  deliveredAt: string;
  courierReference?: string | null;
  notes?: string | null;
  hasProofImage: boolean;
  confirmedBy?: number | null;
  confirmedByName?: string | null;
  confirmedAt: string;
};

export type DeliveryConfirmationInput = {
  receivedBy: string;
  /** ISO timestamp (UTC). */
  deliveredAt: string;
  courierReference?: string;
  /** Shrunk image as a data URL. */
  proofImage?: string;
  notes?: string;
};

export const STATUS_PIPELINE: OrderStatus[] = [
  "pending",
  "processing",
  "paid",
  "ready_for_delivery",
  "shipped",
  "delivered",
  "completed",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  awaiting_stock: "Awaiting Stock",
  processing: "Processing",
  paid: "Paid",
  ready_for_delivery: "For Delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refund_requested: "Refund Req.",
  refunded: "Refunded",
  void_requested: "Void Req.",
  voided: "Voided",
};

// ── Product Management ──────────────────────────────────────────────

export type ProductCategory = "Ube Halaya" | "Ube Jam";

export const PRODUCT_CATEGORIES: ProductCategory[] = ["Ube Halaya", "Ube Jam"];

export interface Product {
  id:          string;
  name:        string;
  category:    ProductCategory;
  description: string;
  isActive:    boolean;
  createdAt:   string;
}

export interface Variation {
  id:            string;
  productId:     string;
  packagingType: string;
  size:          string;
  price:         number;
  sku:           string;
  isActive:      boolean;
}

// ── Inventory & Analytics ───────────────────────────────────────────

export interface StockLevel {
  variationId: string;
  productName?: string;
  variationName?: string;
  location:    string;
  locationId?: number;
  quantity:    number;
  lowStockThreshold: number;
}

export interface StockMovement {
  id:          string;
  variationId: string;
  productName?: string;
  variationName?: string;
  quantity:    number;
  type:        "arrival" | "sale" | "adjustment";
  date:        string;
  reference:   string; // e.g., PO # or Order #
  notes?:      string;
}

export interface AnalyticsData {
  date:  string;
  sales: number;
  orders: number;
}

/**
 * The items and quantities in the refund request awaiting a manager. Requests filed before
 * item refunds existed carry no per-item counts, so they cover everything not yet refunded.
 */
export function pendingRefundLines(order: Order): Order["items"] {
  const pending = order.items
    .filter((item) => (item.pendingRefundQuantity ?? 0) > 0)
    .map((item) => ({ ...item, quantity: item.pendingRefundQuantity ?? 0 }));
  if (pending.length > 0) return pending;
  return order.items
    .map((item) => ({ ...item, quantity: item.quantity - (item.refundedQuantity ?? 0) }))
    .filter((item) => item.quantity > 0);
}

/** Units of each item that can still be refunded (bought, minus refunded, minus awaiting approval). */
export function refundableQuantity(item: Order["items"][number]): number {
  return Math.max(0, item.quantity - (item.refundedQuantity ?? 0) - (item.pendingRefundQuantity ?? 0));
}

/**
 * Whether the order's latest refund request was rejected. A partial refund approval also
 * returns the order to Completed, so the history remark tells the two apart.
 */
export function latestRefundWasRejected(order: Order): boolean {
  const decisions = (order.statusHistory ?? []).filter((h) => h.oldStatus === "Refund Requested");
  const latest = decisions.reduce<OrderStatusHistory | null>(
    (last, h) => (!last || new Date(h.createdAt) > new Date(last.createdAt) ? h : last),
    null,
  );
  if (latest) return (latest.remarks ?? "").toLowerCase().startsWith("refund rejected");
  return (order.remarks ?? "").toLowerCase().startsWith("refund rejected");
}

/** Refunds go back the way the customer paid: cash from the drawer, or to their GCash. */
export function refundMethodOf(order: Order): "Cash" | "GCash" {
  if (order.refundMethod) return order.refundMethod;
  return ["cash", "cod", "cash on delivery"].includes(order.paymentMethod?.trim().toLowerCase() ?? "") ? "Cash" : "GCash";
}

export const REFUND_METHOD_HINT: Record<"Cash" | "GCash", string> = {
  Cash: "Hand back cash from the drawer",
  GCash: "Send to the customer's GCash",
};

/** "Nov 12, 2026, 11:59 PM" (Philippine time) for the last minute of the refund window. */
export function formatRefundDeadline(deadlineIso: string): string {
  return new Date(Date.parse(deadlineIso) - 60_000).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
