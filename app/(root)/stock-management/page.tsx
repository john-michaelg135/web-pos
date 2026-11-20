import { Suspense } from "react";
import { ViewStockManagement } from "@/pages/pos/ViewStockManagement";
import { StockManagementSkeleton } from "@/components/shared/PageSkeleton";

export const metadata = {
  title: "Bren Raphael's | Point of Sale System",
  description: "View stock levels and receive inventory.",
};

// The page reads ?tab=, ?transferId=, ?locationId= and ?variationId= (notification links).
export default function StockManagementPage() {
  return (
    <Suspense fallback={<StockManagementSkeleton />}>
      <ViewStockManagement />
    </Suspense>
  );
}
