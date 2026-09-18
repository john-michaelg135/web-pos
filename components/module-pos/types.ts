export type OrderStatus =
  | "pending"
  | "awaiting_stock"
  | "processing"
  | "ready_for_delivery"
  | "shipped"
  | "delivered"
  | "paid"
  | "completed"
  | "rejected"
  | "cancelled"
  | "refund_requested"
  | "refunded";

export type OrderStatusHistory = {
  id: number;
  orderId: number;
  oldStatus: string;
  newStatus: string;
  changedBy?: number | null;
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
    name: string;
    variation: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: OrderStatus;
  date: string;
  location: string;
  isPreOrder: boolean;
  paymentStatus: "pending" | "paid";
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
};

export const STATUS_PIPELINE: OrderStatus[] = [
  "pending",
  "processing",
  "ready_for_delivery",
  "shipped",
  "delivered",
  "paid",
  "completed",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  awaiting_stock: "Awaiting Stock",
  processing: "Processing",
  ready_for_delivery: "For Delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  paid: "Paid",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refund_requested: "Refund Req.",
  refunded: "Refunded",
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
