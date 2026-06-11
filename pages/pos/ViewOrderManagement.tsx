"use client";

import { useState, useMemo, useEffect } from "react";
import { FilterIcon, CloseLineIcon } from "../../icons/index";
import { Order, OrderStatus, STATUS_LABELS } from "@/components/module-pos/types";
import OrderCard from "@/components/module-pos/OrderCard";
import ReviewDialog from "@/components/module-pos/ReviewDialog";
import RefundFormDialog from "@/components/module-pos/RefundFormDialog";
import OrderFilters from "@/components/module-pos/OrderFilters";
import { OrderManagementResponseDto } from "../../components/module-pos/api/api";
import { toast } from "sonner";
import { useTheme as useRealTheme } from "@/context/ThemeContext";
import { apiClient } from "@/components/module-pos/api";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

const SearchIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export default function ViewOrderManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"pending" | "active" | "history" | "refunds">("pending");
  const [channelTab, setChannelTab] = useState<"all" | "pos" | "web">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPreOrder, setFilterPreOrder] = useState<string>("All");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
  const [orderToConfirmRefund, setOrderToConfirmRefund] = useState<Order | null>(null);

  const mapToFrontendOrder = (dto: OrderManagementResponseDto): Order => {
    return {
      id: dto.orderId?.toString() || "0",
      type: (dto.orderType?.toLowerCase() as "walk-in" | "store" | "online" | "institutional") || "online",
      customer: dto.customerId ? `Customer ${dto.customerId}` : "Customer",
      items: dto.items && dto.items.length > 0
        ? dto.items.map((i) => ({
            name: i.productName || "Order Item",
            variation: i.variationName || "Standard",
            quantity: Number(i.quantity) || 1,
            price: Number(i.unitPrice) || 0,
          }))
        : [
            { name: "Order Items", variation: "Mixed", quantity: 1, price: Number(dto.totalAmount) || 0 }
          ],
      total: Number(dto.totalAmount) || 0,
      status: (dto.orderStatus?.toLowerCase().replace(" ", "_") as OrderStatus) || "pending",
      date: new Date(dto.createdAt || new Date()).toLocaleDateString(),
      location: dto.locationName || "Unknown",
      isPreOrder: !!dto.isPreorder,
      paymentStatus: (dto.paymentStatus?.toLowerCase() as "pending" | "paid") || "pending",
      remarks: dto.rejectionRemarks || dto.customVariationNotes || "",
    };
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.apiPos.orderManagementOrdersList();
      setOrders(data.map(mapToFrontendOrder));
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
  }, []);

  const resetFilters = () => {
    setFilterType("All");
    setFilterStatus("All");
    setFilterLocation("All");
    setFilterDate("");
    setFilterPreOrder("All");
    setSearchQuery("");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (channelTab === "pos" && o.type.toLowerCase() === "online") return false;
      if (channelTab === "web" && o.type.toLowerCase() !== "online") return false;
      if (searchQuery && !o.id.toLowerCase().includes(searchQuery.toLowerCase()) && !o.customer.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== "All" && o.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== "All" && o.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (filterLocation !== "All" && o.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterDate && o.date !== filterDate) return false;
      if (filterPreOrder !== "All") {
        if (filterPreOrder === "Yes" && !o.isPreOrder) return false;
        if (filterPreOrder === "No" && o.isPreOrder) return false;
      }
      return true;
    });
  }, [orders, channelTab, searchQuery, filterType, filterStatus, filterLocation, filterDate, filterPreOrder]);

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      if (selectedOrder.status === "refund_requested") {
        await apiClient.apiPos.orderManagementOrdersApproveRefundUpdate(Number(selectedOrder.id), { approvedBy: 1 });
        toast.success("Refund approved successfully!");
      } else {
        await apiClient.apiPos.orderManagementOrdersApproveUpdate(Number(selectedOrder.id), { approvedBy: 1 });
        toast.success("Order approved");
      }
      fetchOrders();
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Failed to approve.");
    }
    setShowReviewDialog(false);
    setRemarks("");
  };

  const handleReject = async () => {
    if (!selectedOrder || !remarks.trim()) return;
    try {
      if (selectedOrder.status === "refund_requested") {
        await apiClient.apiPos.orderManagementOrdersRejectRefundUpdate(Number(selectedOrder.id), { rejectedBy: 1, rejectionRemarks: remarks });
        toast.success("Refund rejected successfully!");
      } else {
        await apiClient.apiPos.orderManagementOrdersRejectUpdate(Number(selectedOrder.id), { rejectedBy: 1, rejectionRemarks: remarks });
        toast.success("Order rejected");
      }
      fetchOrders();
    } catch (err) {
      console.error("Failed to reject:", err);
      toast.error("Failed to reject.");
    }
    setShowReviewDialog(false);
    setRemarks("");
  };

  const handleRequestRefundSubmit = async () => {
    if (!selectedOrder || !refundReason.trim()) return;

    if (refundReason.trim().length > 500) {
      toast.error("Reason must not exceed 500 characters.");
      return;
    }

    if (/[<>]/.test(refundReason)) {
      toast.error("Reason cannot contain HTML characters (<, >).");
      return;
    }

    try {
      await apiClient.apiPos.orderManagementOrdersRequestRefundUpdate(Number(selectedOrder.id), { reason: refundReason });
      toast.success("Refund requested successfully.");
      fetchOrders();
    } catch (err) {
      console.error("Failed to request refund:", err);
      toast.error("Failed to request refund.");
    }
    setShowRefundDialog(false);
    setRefundReason("");
  };

  const confirmRequestRefund = (order: Order) => {
    setOrderToConfirmRefund(order);
    setShowConfirmRefundModal(true);
  };

  const handleConfirmRefund = () => {
    if (orderToConfirmRefund) {
      setOrders(prev => prev.map(o => o.id === orderToConfirmRefund.id ? { ...o, status: "refund_requested" } : o));
      setActiveTab("refunds");
    }
    setShowConfirmRefundModal(false);
    setOrderToConfirmRefund(null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // In a real app, you would have an endpoint to update status generally, or confirm delivery.
    // For now, if newStatus === 'completed', we can confirm delivery.
    if (newStatus === "completed") {
      try {
        await apiClient.apiPos.orderManagementOrdersConfirmDeliveryUpdate(Number(orderId), { confirmedBy: 1 });
        toast.success("Order marked as completed.");
        fetchOrders();
      } catch (err) {
        console.error("Failed to confirm delivery:", err);
        toast.error("Failed to confirm delivery.");
      }
    }
  };

  const pendingApproval = filteredOrders.filter((o) => o.status === "pending");
  const activeOrders = filteredOrders.filter((o) => 
    o.status !== "pending" && (o.isPreOrder || !["completed", "rejected", "refund_requested", "refunded"].includes(o.status))
  );
  const historyOrders = filteredOrders.filter((o) => 
    !o.isPreOrder && ["completed", "rejected", "refunded"].includes(o.status)
  );
  const refundOrders = filteredOrders.filter((o) => o.status === "refund_requested");

  // Design Tokens
  const { theme } = useTheme();
  const dark = theme === "dark";
  const isMobile = useMediaQuery("(max-width: 768px)");
  const primary = "#465fff";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const text = dark ? "#f0f4f8" : "#101828";
  const muted = dark ? "#8899aa" : "#667085";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const cardBg = dark ? "#212d40" : "#ffffff";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    borderRadius: 12, border: `1px solid ${border}`,
    background: inputBg, color: text,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!authUser || (authUser.username !== "posuser" && !authUser.apps.includes("order-management"))) {
    return <AccessDenied />;
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto" style={{ color: text }}>
      {/* Header */}
      <div className="flex-shrink-0" style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 20 : 0 }}>
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Order Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage all orders across channels</p>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: 12, width: isMobile ? "100%" : "auto" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <SearchIcon style={{ width: 16, height: 16, color: muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              placeholder="Search ID or Customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={25}
              style={{ ...inputStyle, paddingLeft: 40, width: "100%", height: 48 }}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ height: 48, width: isMobile ? "100%" : "auto", padding: "0 24px", borderRadius: 16, border: `1px solid ${border}`, background: showFilters ? primary : inputBg, color: showFilters ? "#fff" : text, fontSize: 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap" }}
          >
            <FilterIcon viewBox="0 0 24 24" style={{ width: 14, height: 14 }} /> Filters
          </button>
        </div>
      </div>

      <OrderFilters 
        show={showFilters}
        filterType={filterType} setFilterType={setFilterType}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterLocation={filterLocation} setFilterLocation={setFilterLocation}
        filterDate={filterDate} setFilterDate={setFilterDate}
        filterPreOrder={filterPreOrder} setFilterPreOrder={setFilterPreOrder}
        resetFilters={resetFilters}
        border={border} muted={muted} cardBg={cardBg} inputBg={inputBg} text={text} isMobile={isMobile}
      />

      {/* Channel Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto mb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setChannelTab("all")}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${channelTab === "all" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            All Orders
          </button>
          <button 
            onClick={() => setChannelTab("pos")}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${channelTab === "pos" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            POS Orders
          </button>
          <button 
            onClick={() => setChannelTab("web")}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${channelTab === "web" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            Web Orders
          </button>
        </div>
      </div>
      {/* Status Tabs */}
      <div className="flex-shrink-0" style={{ display: "flex", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 12, width: isMobile ? "100%" : "auto" }}>
          <button 
            onClick={() => setActiveTab("pending")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "pending" ? primary : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "pending" ? `${primary}1A` : "transparent", color: activeTab === "pending" ? primary : muted, whiteSpace: "nowrap" }}
          >
            Pending ({pendingApproval.length})
          </button>
          <button 
            onClick={() => setActiveTab("active")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "active" ? primary : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "active" ? `${primary}1A` : "transparent", color: activeTab === "active" ? primary : muted, whiteSpace: "nowrap" }}
          >
            Active ({activeOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "history" ? primary : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "history" ? `${primary}1A` : "transparent", color: activeTab === "history" ? primary : muted, whiteSpace: "nowrap" }}
          >
            History ({historyOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab("refunds")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "refunds" ? "#ef4444" : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "refunds" ? "rgba(239, 68, 68, 0.1)" : "transparent", color: activeTab === "refunds" ? "#ef4444" : muted, whiteSpace: "nowrap" }}
          >
            Refunds ({refundOrders.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
           <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(450px, 1fr))", gap: 24 }}>
          {(activeTab === "pending" ? pendingApproval : activeTab === "active" ? activeOrders : activeTab === "history" ? historyOrders : refundOrders).map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              primary={primary} 
              muted={muted} 
              border={border} 
              text={text} 
              cardBg={cardBg}
              inputBg={inputBg}
              onReview={() => { setSelectedOrder(order); setShowReviewDialog(true); }}
              onRequestRefund={() => { setSelectedOrder(order); setShowRefundDialog(true); }}
              onApplyRefund={() => { setSelectedOrder(order); setShowReviewDialog(true); }}
              onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
              isMobile={isMobile}
            />
          ))}
          {(activeTab === "pending" ? pendingApproval : activeTab === "active" ? activeOrders : activeTab === "history" ? historyOrders : refundOrders).length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: muted }}>
              No {activeTab} orders found.
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <ReviewDialog 
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        order={selectedOrder}
        remarks={remarks}
        setRemarks={setRemarks}
        onApprove={handleApprove}
        onReject={handleReject}
        primary={primary}
        muted={muted}
        border={border}
        text={text}
        cardBg={cardBg}
        inputBg={inputBg}
        isMobile={isMobile}
      />

      {/* Refund Request Dialog */}
      <RefundFormDialog
        isOpen={showRefundDialog}
        onClose={() => setShowRefundDialog(false)}
        order={selectedOrder}
        reason={refundReason}
        setReason={setRefundReason}
        onSubmit={handleRequestRefundSubmit}
        primary={primary}
        muted={muted}
        border={border}
        text={text}
        cardBg={cardBg}
        inputBg={inputBg}
        isMobile={isMobile}
      />
    </div>
  );
}
