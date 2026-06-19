"use client";

import { useState, useMemo, useEffect } from "react";
import { FilterIcon, CloseLineIcon } from "../../icons/index";
import { Order, OrderStatus, STATUS_LABELS } from "@/components/module-pos/types";
import OrderCard from "@/components/module-pos/OrderCard";

import RefundFormDialog from "@/components/module-pos/RefundFormDialog";
import RejectRefundDialog from "@/components/module-pos/RejectRefundDialog";
import ApproveRefundDialog from "@/components/module-pos/ApproveRefundDialog";
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

import { useRouter } from "next/navigation";

export default function ViewOrderManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cashierLocationName, setCashierLocationName] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"pending" | "active" | "completed" | "refunds" | "cancelled">("pending");
  const [refundSubTab, setRefundSubTab] = useState<"requested" | "refunded" | "rejected">("requested");
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

  const [remarks, setRemarks] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState<Order | null>(null);
  const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
  const [orderToConfirmRefund, setOrderToConfirmRefund] = useState<Order | null>(null);

  const mapToFrontendOrder = (dto: OrderManagementResponseDto): Order => {
    return {
      id: dto.orderId?.toString() || "0",
      type: (dto.orderType?.toLowerCase() as "walk-in" | "store" | "online" | "institutional") || "online",
      source: dto.orderSource,
      customer: (dto as any).seniorPwdName ? (dto as any).seniorPwdName : (dto.contactPerson ? dto.contactPerson : (dto.customerId ? `Customer ${dto.customerId}` : "Customer")),
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
      paymentUrl: dto.payments?.find(p => p.gatewayReferenceNumber)?.gatewayReferenceNumber || null,
      deliveryAddress: dto.deliveryAddress || "",
      customVariationNotes: dto.customVariationNotes || "",
      seniorPwdId: (dto as any).seniorPwdId || "",
      seniorPwdName: (dto as any).seniorPwdName || "",
      seniorPwdStreet: (dto as any).seniorPwdStreet || "",
      seniorPwdBarangay: (dto as any).seniorPwdBarangay || "",
      seniorPwdCity: (dto as any).seniorPwdCity || "",
      seniorPwdProvince: (dto as any).seniorPwdProvince || "",
      seniorPwdZipCode: (dto as any).seniorPwdZipCode || "",
      statusHistory: (dto as any).statusHistory
        ? (dto as any).statusHistory.map((h: any) => ({
            id: h.id,
            orderId: h.orderId,
            oldStatus: h.oldStatus,
            newStatus: h.newStatus,
            changedBy: h.changedBy,
            remarks: h.remarks,
            createdAt: h.createdAt
          }))
        : [],
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

  useEffect(() => {
    if (authUser?.subRole === "Cashier" && authUser.locationId) {
      setChannelTab("pos");
      const fetchCashierLocation = async () => {
        try {
          const { data } = await apiClient.apiPos.locationsList();
          const matched = data.find(l => Number(l.locationId) === Number(authUser.locationId));
          if (matched) {
            setCashierLocationName(matched.locationName || "");
            setFilterLocation(matched.locationName || "Store");
          }
        } catch (err) {
          console.error("Failed to fetch locations in order management:", err);
        }
      };
      fetchCashierLocation();
    }
  }, [authUser]);

  const resetFilters = () => {
    setFilterType("All");
    setFilterStatus("All");
    if (authUser?.subRole === "Cashier") {
      setFilterLocation(cashierLocationName || "Store");
    } else {
      setFilterLocation("All");
    }
    setFilterDate("");
    setFilterPreOrder("All");
    setSearchQuery("");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const isWebOrder = o.type.toLowerCase() === "online" || o.source?.toLowerCase() === "e-commerce" || o.source?.toLowerCase() === "ecommerce";
      const isRefundStatus = o.status === "refund_requested" || o.status === "refunded";

      // Cashier security lock: Can only see their own location's orders, and cannot see online/web orders at all
      // EXCEPTION: E-commerce refund requests are allowed to reflect in the POS refunds tab
      if (authUser?.subRole === "Cashier") {
        if (isWebOrder && !isRefundStatus) {
          return false;
        }
        if (cashierLocationName && o.location.toLowerCase() !== cashierLocationName.toLowerCase() && !isRefundStatus) {
          return false;
        }
      }

      if (channelTab === "pos" && isWebOrder && !isRefundStatus) return false;
      if (channelTab === "web" && !isWebOrder) return false;
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
  }, [orders, channelTab, searchQuery, filterType, filterStatus, filterLocation, filterDate, filterPreOrder, authUser, cashierLocationName]);



  const handleApproveRefund = (order: Order) => {
    setOrderToApprove(order);
    setShowApproveDialog(true);
  };

  const handleApproveRefundSubmit = async () => {
    if (!orderToApprove) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.apiPos.orderManagementOrdersApproveRefundUpdate(Number(orderToApprove.id), { approvedBy: managerId });
      toast.success(
        <div className="flex flex-col gap-1 text-emerald-800 dark:text-emerald-200">
          <div className="font-bold">Refund approved!</div>
          <div className="text-[11px] flex items-center justify-between border-b pb-1 mb-1 border-emerald-500/20">
            <span className="text-gray-500 dark:text-gray-400">Amount deducted from sales:</span>
            <span className="font-black text-red-500">- ₱{orderToApprove.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Restored inventory stocks:</div>
          <div className="text-[11px] flex flex-col gap-0.5 mt-1 border-t pt-1 border-emerald-500/20">
            {orderToApprove.items.map((item, idx) => (
              <div key={idx} className="flex justify-between gap-4">
                <span>{item.name} ({item.variation})</span>
                <span className="font-bold">+{item.quantity} qty</span>
              </div>
            ))}
          </div>
        </div>,
        { duration: 10000 }
      );
      fetchOrders();
    } catch (err) {
      console.error("Failed to approve refund:", err);
      toast.error("Failed to approve refund.");
    }
    setShowApproveDialog(false);
    setOrderToApprove(null);
  };

  const handleRejectRefund = (order: Order) => {
    setOrderToReject(order);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleRejectRefundSubmit = async () => {
    if (!orderToReject || !rejectReason.trim()) return;

    if (rejectReason.trim().length > 500) {
      toast.error("Reason must not exceed 500 characters.");
      return;
    }

    if (/[<>]/.test(rejectReason)) {
      toast.error("Reason cannot contain HTML characters (<, >).");
      return;
    }

    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.apiPos.orderManagementOrdersRejectRefundUpdate(Number(orderToReject.id), {
        rejectedBy: managerId,
        rejectionRemarks: rejectReason.trim()
      });
      toast.success(`Refund request for Order #${orderToReject.id} has been rejected.`);
      fetchOrders();
    } catch (err) {
      console.error("Failed to reject refund:", err);
      toast.error("Failed to reject refund.");
    }
    setShowRejectDialog(false);
    setRejectReason("");
    setOrderToReject(null);
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
      toast.success(`Refund requested successfully for Order #${selectedOrder.id}.`);
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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      const statusMap: Record<string, string> = {
        pending: "Pending",
        awaiting_stock: "Awaiting Stock",
        processing: "Processing",
        ready_for_delivery: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        completed: "Completed",
        rejected: "Cancelled",
        cancelled: "Cancelled",
        refund_requested: "Refund Requested",
        refunded: "Refunded"
      };
      const backendStatus = statusMap[newStatus] || newStatus;
      await apiClient.instance.put(`/api-pos/order-management/orders/${orderId}/status`, { 
        status: backendStatus, 
        updatedBy: 1 
      });
      
      const order = orders.find(o => o.id === orderId);
      if ((newStatus === "cancelled" || backendStatus === "Cancelled" || newStatus === "refunded" || backendStatus === "Refunded") && order) {
        toast.success(
          <div className="flex flex-col gap-1 text-emerald-800 dark:text-emerald-200">
            <div className="font-bold">Order status updated.</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Restored inventory stocks:</div>
            <div className="text-[11px] flex flex-col gap-0.5 mt-1 border-t pt-1 border-emerald-500/20">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <span>{item.name} ({item.variation})</span>
                  <span className="font-bold">+{item.quantity} qty</span>
                </div>
              ))}
            </div>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success("Order status updated.");
      }

      fetchOrders();
      return true;
    } catch (err) {
      console.error("Failed to update order status:", err);
      toast.error("Failed to update order status.");
      return false;
    }
  };

  const pendingApproval = filteredOrders.filter((o) => o.status === "pending" || o.status === "awaiting_stock");
  const activeOrders = filteredOrders.filter((o) => 
    o.status !== "pending" && o.status !== "awaiting_stock" && !["completed", "delivered", "rejected", "cancelled", "refund_requested", "refunded"].includes(o.status)
  );
  const rejectedRefunds = filteredOrders
    .filter((o) => 
      o.status === "completed" && 
      (o.remarks?.toLowerCase().startsWith("refund rejected") || 
       o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed"))
    )
    .map((o) => ({ ...o, status: "rejected" as const }));
  const completedOrders = filteredOrders.filter((o) => 
    ["completed", "delivered"].includes(o.status) && 
    !(o.remarks?.toLowerCase().startsWith("refund rejected") || 
      o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed"))
  );
  const refundRequests = filteredOrders.filter((o) => o.status === "refund_requested");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const cancelledOrders = filteredOrders.filter((o) => 
    ["cancelled", "rejected"].includes(o.status)
  );

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

  const hasAccess = authUser && (authUser.username === "posuser" || authUser.apps.includes("order-management") || authUser.roles?.includes("Admin") || authUser.subRole === "Admin");

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace("/access-denied");
    }
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!hasAccess) {
    return null;
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-transparent flex flex-col gap-4 md:gap-6 overflow-y-auto" style={{ color: text }}>
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
      {authUser?.subRole !== "Cashier" && (
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
      )}
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
            onClick={() => setActiveTab("completed")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "completed" ? primary : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "completed" ? `${primary}1A` : "transparent", color: activeTab === "completed" ? primary : muted, whiteSpace: "nowrap" }}
          >
            Completed ({completedOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab("refunds")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "refunds" ? "#ef4444" : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "refunds" ? "rgba(239, 68, 68, 0.1)" : "transparent", color: activeTab === "refunds" ? "#ef4444" : muted, whiteSpace: "nowrap" }}
          >
            Refunds ({refundRequests.length + refundedOrders.length + rejectedRefunds.length})
          </button>
          <button 
            onClick={() => setActiveTab("cancelled")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "10px 0" : "10px 24px", borderRadius: 12, border: `1px solid ${activeTab === "cancelled" ? "#ef4444" : border}`, fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "cancelled" ? "rgba(239, 68, 68, 0.1)" : "transparent", color: activeTab === "cancelled" ? "#ef4444" : muted, whiteSpace: "nowrap" }}
          >
            Cancelled ({cancelledOrders.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
           <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {activeTab === "refunds" && (
            <div className="flex items-center gap-3 no-print mb-2 w-full max-w-xs">
              <select
                value={refundSubTab}
                onChange={(e) => setRefundSubTab(e.target.value as "requested" | "refunded" | "rejected")}
                className="text-xs px-3.5 py-2.5 rounded-xl border outline-none font-bold transition-all w-full shadow-sm cursor-pointer"
                style={{ background: cardBg, borderColor: border, color: text }}
              >
                <option value="requested">Refund Requests ({refundRequests.length})</option>
                <option value="refunded">Refunded ({refundedOrders.length})</option>
                <option value="rejected">Rejected ({rejectedRefunds.length})</option>
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(450px, 1fr))", gap: 24 }}>
            {(
              activeTab === "pending" ? pendingApproval : 
              activeTab === "active" ? activeOrders : 
              activeTab === "completed" ? completedOrders : 
              activeTab === "refunds" ? (refundSubTab === "requested" ? refundRequests : refundSubTab === "refunded" ? refundedOrders : rejectedRefunds) : 
              cancelledOrders
            ).map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                primary={primary} 
                muted={muted} 
                border={border} 
                text={text} 
                cardBg={cardBg}
                inputBg={inputBg}
                onRequestRefund={() => { setSelectedOrder(order); setShowRefundDialog(true); }}
                onApplyRefund={() => handleApproveRefund(order)}
                onRejectRefund={() => handleRejectRefund(order)}
                onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
                isMobile={isMobile}
              />
            ))}
            {(
              activeTab === "pending" ? pendingApproval : 
              activeTab === "active" ? activeOrders : 
              activeTab === "completed" ? completedOrders : 
              activeTab === "refunds" ? (refundSubTab === "requested" ? refundRequests : refundSubTab === "refunded" ? refundedOrders : rejectedRefunds) : 
              cancelledOrders
            ).length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: muted }}>
                No {activeTab === "refunds" ? (refundSubTab === "requested" ? "refund request" : refundSubTab === "refunded" ? "refunded" : "rejected") : activeTab} orders found.
              </div>
            )}
          </div>
        </div>
      )}



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

      {/* Reject Refund Dialog */}
      <RejectRefundDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        order={orderToReject}
        reason={rejectReason}
        setReason={setRejectReason}
        onSubmit={handleRejectRefundSubmit}
        primary={primary}
        muted={muted}
        border={border}
        text={text}
        cardBg={cardBg}
        inputBg={inputBg}
        isMobile={isMobile}
      />

      {/* Approve Refund Dialog */}
      <ApproveRefundDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        order={orderToApprove}
        onSubmit={handleApproveRefundSubmit}
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
