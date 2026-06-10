import { ViewStockManagement } from "@/pages/pos/ViewStockManagement";

export const metadata = {
  title: "Stock Management | ERP System",
  description: "View stock levels and receive inventory.",
};

export default function StockManagementPage() {
  return <ViewStockManagement />;
}
