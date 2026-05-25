export type OrderStatus =
  | "pending"
  | "processing"
  | "ready_for_delivery"
  | "dispatched"
  | "delivered"
  | "paid"
  | "completed"
  | "rejected";

export type Order = {
  id: string;
  type: "walk-in" | "online" | "institutional";
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
  location: "Store" | "Bazaar";
  isPreOrder: boolean;
  paymentStatus: "pending" | "paid";
  remarks?: string;
};

export const STATUS_PIPELINE: OrderStatus[] = [
  "pending",
  "processing",
  "ready_for_delivery",
  "dispatched",
  "delivered",
  "paid",
  "completed",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready_for_delivery: "Ready for Delivery",
  dispatched: "Dispatched",
  delivered: "Delivered",
  paid: "Paid",
  completed: "Completed",
  rejected: "Rejected",
};
