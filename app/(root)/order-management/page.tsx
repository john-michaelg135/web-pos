import { Suspense } from "react";
import ViewOrderManagement from "@/pages/pos/ViewOrderManagement";
import { OrderManagementSkeleton } from "@/components/shared/PageSkeleton";

export const metadata = {
  title: "Order Management | R3B2P POS",
};

// The page reads ?orderId= (a notification link), which needs a Suspense boundary.
export default function OrderManagementPage() {
  return (
    <Suspense fallback={<OrderManagementSkeleton />}>
      <ViewOrderManagement />
    </Suspense>
  );
}
