"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { Order, OrderStatus, STATUS_LABELS } from "@/components/module-pos/types";
import OrderCard from "@/components/module-pos/OrderCard";
import RefundFormDialog from "@/components/module-pos/RefundFormDialog";
import RejectRefundDialog from "@/components/module-pos/RejectRefundDialog";
import ApproveRefundDialog from "@/components/module-pos/ApproveRefundDialog";
import OrderFilters from "@/components/module-pos/OrderFilters";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { OrderManagementResponseDto } from "../../components/module-pos/api/api";
import { toast } from "sonner";
import { apiClient } from "@/components/module-pos/api";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Legacy color props for child components that haven't been rewritten yet
const LEGACY_COLORS = {
  primary: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  text: "#18181b",
  cardBg: "#ffffff",
  inputBg: "#fafafa",
};

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

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");

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

  const isMobile = useMediaQuery("(max-width: 768px)");

  const mapToFrontendOrder = (dto: OrderManagementResponseDto): Order => ({
    id: dto.orderId?.toString() || "0",
    orderNumber: dto.orderNumber || (dto.orderId ? `#${dto.orderId}` : undefined),
    type: (dto.orderType?.toLowerCase() as "walk-in" | "store" | "online" | "institutional") || "online",
    source: dto.orderSource,
    customer: (dto as any).seniorPwdName ? (dto as any).seniorPwdName : (dto.contactPerson ? dto.contactPerson : (dto.customerId ? `Customer ${dto.customerId}` : "Customer")),
    items: dto.items && dto.items.length > 0
      ? dto.items.map((i) => ({ name: i.productName || "Order Item", variation: i.variationName || "Standard", quantity: Number(i.quantity) || 1, price: Number(i.unitPrice) || 0 }))
      : [{ name: "Order Items", variation: "Mixed", quantity: 1, price: Number(dto.totalAmount) || 0 }],
    total: Number(dto.totalAmount) || 0,
    status: (dto.orderStatus?.toLowerCase().replace(" ", "_") as OrderStatus) || "pending",
    date: new Date(dto.createdAt || new Date()).toLocaleDateString(),
    location: dto.locationName || "Unknown",
    isPreOrder: !!dto.isPreorder,
    paymentStatus: (dto.paymentStatus?.toLowerCase() as "pending" | "paid") || "pending",
    remarks: dto.rejectionRemarks || dto.customVariationNotes || "",
    paymentUrl: dto.payments?.find(p => p.gatewayReferenceNumber)?.gatewayReferenceNumber || null,
    deliveryAddress: dto.deliveryAddress || "",
    amountTendered: (dto as any).amountTendered,
    changeAmount: (dto as any).changeAmount,
    customVariationNotes: dto.customVariationNotes || "",
    seniorPwdId: (dto as any).seniorPwdId || "",
    seniorPwdName: (dto as any).seniorPwdName || "",
    seniorPwdStreet: (dto as any).seniorPwdStreet || "",
    seniorPwdBarangay: (dto as any).seniorPwdBarangay || "",
    seniorPwdCity: (dto as any).seniorPwdCity || "",
    seniorPwdProvince: (dto as any).seniorPwdProvince || "",
    seniorPwdZipCode: (dto as any).seniorPwdZipCode || "",
    statusHistory: (dto as any).statusHistory
      ? (dto as any).statusHistory.map((h: any) => ({ id: h.id, orderId: h.orderId, oldStatus: h.oldStatus, newStatus: h.newStatus, changedBy: h.changedBy, remarks: h.remarks, createdAt: h.createdAt }))
      : [],
  });

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

  useEffect(() => { setIsMounted(true); fetchOrders(); }, []);

  useEffect(() => {
    if ((authUser?.subRole === "Cashier" || authUser?.subRole === "OrderManager") && authUser.locationId) {
      if (authUser?.subRole === "Cashier") setChannelTab("pos");
      const fetchUserLocation = async () => {
        try {
          const { data } = await apiClient.apiPos.locationsList();
          const matched = data.find(l => Number(l.locationId) === Number(authUser.locationId));
          if (matched) { setCashierLocationName(matched.locationName || ""); setFilterLocation(matched.locationName || "Store"); }
        } catch (err) { console.error("Failed to fetch locations in order management:", err); }
      };
      fetchUserLocation();
    }
  }, [authUser]);

  const resetFilters = () => {
    setFilterType("All");
    setFilterStatus("All");
    if ((authUser?.subRole === "Cashier" || authUser?.subRole === "OrderManager") && authUser.locationId) {
      setFilterLocation(cashierLocationName || "Store");
    } else { setFilterLocation("All"); }
    setSearchQuery("");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const isWebOrder = o.type.toLowerCase() === "online" || o.source?.toLowerCase() === "e-commerce" || o.source?.toLowerCase() === "ecommerce";
      const isRefundStatus = o.status === "refund_requested" || o.status === "refunded";
      if ((authUser?.subRole === "Cashier" || authUser?.subRole === "OrderManager") && authUser.locationId) {
        if (authUser?.subRole === "Cashier" && isWebOrder && !isRefundStatus) return false;
        if (cashierLocationName && o.location.toLowerCase() !== cashierLocationName.toLowerCase() && !isRefundStatus) return false;
      }
      if (channelTab === "pos" && isWebOrder && !isRefundStatus) return false;
      if (channelTab === "web" && !isWebOrder) return false;
      if (searchQuery && !o.id.toLowerCase().includes(searchQuery.toLowerCase()) && !o.customer.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== "All" && o.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== "All" && o.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (filterLocation !== "All" && o.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      return true;
    });
  }, [orders, channelTab, searchQuery, filterType, filterStatus, filterLocation, authUser, cashierLocationName]);

  const handleApproveRefund = (order: Order) => { setOrderToApprove(order); setShowApproveDialog(true); };

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
              <div key={idx} className="flex justify-between gap-4"><span>{item.name} ({item.variation})</span><span className="font-bold">+{item.quantity} qty</span></div>
            ))}
          </div>
        </div>,
        { duration: 10000 }
      );
      fetchOrders();
    } catch (err) { console.error("Failed to approve refund:", err); toast.error("Failed to approve refund."); }
    setShowApproveDialog(false);
    setOrderToApprove(null);
  };

  const handleRejectRefund = (order: Order) => { setOrderToReject(order); setRejectReason(""); setShowRejectDialog(true); };

  const handleRejectRefundSubmit = async () => {
    if (!orderToReject || !rejectReason.trim()) return;
    if (rejectReason.trim().length > 500) { toast.error("Reason must not exceed 500 characters."); return; }
    if (/[<>]/.test(rejectReason)) { toast.error("Reason cannot contain HTML characters (<, >)."); return; }
    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.apiPos.orderManagementOrdersRejectRefundUpdate(Number(orderToReject.id), { rejectedBy: managerId, rejectionRemarks: rejectReason.trim() });
      toast.success(`Refund request for Order ${orderToReject.orderNumber || `#${orderToReject.id}`} has been rejected.`);
      fetchOrders();
    } catch (err) { console.error("Failed to reject refund:", err); toast.error("Failed to reject refund."); }
    setShowRejectDialog(false); setRejectReason(""); setOrderToReject(null);
  };

  const handleRequestRefundSubmit = async () => {
    if (!selectedOrder || !refundReason.trim()) return;
    if (refundReason.trim().length > 500) { toast.error("Reason must not exceed 500 characters."); return; }
    if (/[<>]/.test(refundReason)) { toast.error("Reason cannot contain HTML characters (<, >)."); return; }
    try {
      await apiClient.apiPos.orderManagementOrdersRequestRefundUpdate(Number(selectedOrder.id), { reason: refundReason });
      toast.success(`Refund requested successfully for Order ${selectedOrder.orderNumber || `#${selectedOrder.id}`}.`);
      fetchOrders();
    } catch (err) { console.error("Failed to request refund:", err); toast.error("Failed to request refund."); }
    setShowRefundDialog(false); setRefundReason("");
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      const statusMap: Record<string, string> = { pending: "Pending", awaiting_stock: "Awaiting Stock", processing: "Processing", ready_for_delivery: "Processing", shipped: "Shipped", delivered: "Delivered", completed: "Completed", rejected: "Cancelled", cancelled: "Cancelled", refund_requested: "Refund Requested", refunded: "Refunded" };
      const backendStatus = statusMap[newStatus] || newStatus;
      await apiClient.instance.put(`/api-pos/order-management/orders/${orderId}/status`, { status: backendStatus, updatedBy: 1 });
      const order = orders.find(o => o.id === orderId);
      if ((newStatus === "cancelled" || backendStatus === "Cancelled" || newStatus === "refunded" || backendStatus === "Refunded") && order) {
        toast.success(
          <div className="flex flex-col gap-1 text-emerald-800 dark:text-emerald-200">
            <div className="font-bold">Order status updated.</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Restored inventory stocks:</div>
            <div className="text-[11px] flex flex-col gap-0.5 mt-1 border-t pt-1 border-emerald-500/20">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4"><span>{item.name} ({item.variation})</span><span className="font-bold">+{item.quantity} qty</span></div>
              ))}
            </div>
          </div>,
          { duration: 8000 }
        );
      } else { toast.success("Order status updated."); }
      fetchOrders();
      return true;
    } catch (err) { console.error("Failed to update order status:", err); toast.error("Failed to update order status."); return false; }
  };

  const pendingApproval = filteredOrders.filter((o) => o.status === "pending" || o.status === "awaiting_stock");
  const activeOrders = filteredOrders.filter((o) => o.status !== "pending" && o.status !== "awaiting_stock" && !["completed", "delivered", "rejected", "cancelled", "refund_requested", "refunded"].includes(o.status));
  const rejectedRefunds = filteredOrders
    .filter((o) => o.status === "completed" && (o.remarks?.toLowerCase().startsWith("refund rejected") || o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed")))
    .map((o) => ({ ...o, status: "rejected" as const }));
  const completedOrders = filteredOrders.filter((o) => ["completed", "delivered"].includes(o.status) && !(o.remarks?.toLowerCase().startsWith("refund rejected") || o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed")));
  const refundRequests = filteredOrders.filter((o) => o.status === "refund_requested");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const cancelledOrders = filteredOrders.filter((o) => ["cancelled", "rejected"].includes(o.status));

  const hasAccess = authUser && (authUser.username === "posuser" || authUser.apps.includes("order-management") || authUser.roles?.includes("Admin") || authUser.subRole === "Admin");

  useEffect(() => { if (!authLoading && !hasAccess) router.replace("/access-denied"); }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!hasAccess || !isMounted) return null;

  const statusTabs: { key: typeof activeTab; label: string; count: number; destructive?: boolean }[] = [
    { key: "pending", label: "Pending", count: pendingApproval.length },
    { key: "active", label: "Active", count: activeOrders.length },
    { key: "completed", label: "Completed", count: completedOrders.length },
    { key: "refunds", label: "Refunds", count: refundRequests.length + refundedOrders.length + rejectedRefunds.length, destructive: true },
    { key: "cancelled", label: "Cancelled", count: cancelledOrders.length, destructive: true },
  ];

  const currentOrders = activeTab === "pending" ? pendingApproval : activeTab === "active" ? activeOrders : activeTab === "completed" ? completedOrders : activeTab === "refunds" ? (refundSubTab === "requested" ? refundRequests : refundSubTab === "refunded" ? refundedOrders : rejectedRefunds) : cancelledOrders;

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 max-w-7xl mx-auto animate-page-in">
      {/* Header */}
      <div className={cn("flex justify-between gap-5", isMobile ? "flex-col items-start" : "items-center")}>
        <div>
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Order Management</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Track and manage all orders</p>
            <span className="text-muted-foreground font-bold">&middot;</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-bold">
              {filterLocation === "All" ? "All Locations" : (filterLocation.toLowerCase().startsWith("store") ? filterLocation : `Store - ${filterLocation}`)}
            </Badge>
          </div>
        </div>
        <div className={cn("flex items-center gap-3", isMobile && "flex-col w-full")}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ID or Customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} maxLength={25} className="pl-10 h-12" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className={cn("h-12 gap-2 rounded-xl text-xs font-bold uppercase", isMobile && "w-full")}>
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>
      </div>

      <OrderFilters show={showFilters} onClose={() => setShowFilters(false)} filterType={filterType} setFilterType={setFilterType} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterLocation={filterLocation} setFilterLocation={setFilterLocation} resetFilters={resetFilters} />

      {/* Channel Tabs */}
      {authUser?.subRole !== "Cashier" && (
        <div className="flex border-b border-border overflow-x-auto">
          {(["all", "pos", "web"] as const).map((tab) => (
            <button key={tab} onClick={() => setChannelTab(tab)} className={cn("px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors", channelTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab === "all" ? "All Orders" : tab === "pos" ? "POS Orders" : "Web Orders"}
            </button>
          ))}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex overflow-x-auto gap-3">
        {statusTabs.map(({ key, label, count, destructive }) => (
          <Button key={key} variant="outline" size="sm" onClick={() => setActiveTab(key)} className={cn(
            "rounded-xl text-xs font-bold uppercase whitespace-nowrap",
            isMobile && "flex-1 px-0",
            activeTab === key && !destructive && "border-primary bg-primary/10 text-primary",
            activeTab === key && destructive && "border-destructive bg-destructive/10 text-destructive",
            activeTab !== key && "text-muted-foreground"
          )}>
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {activeTab === "refunds" && (
            <div className="w-full max-w-xs">
              <CustomSelect value={refundSubTab} onChange={(val) => setRefundSubTab(val as "requested" | "refunded" | "rejected")} className="w-full max-w-xs" options={[
                { value: "requested", label: `Refund Requests (${refundRequests.length})` },
                { value: "refunded", label: `Refunded (${refundedOrders.length})` },
                { value: "rejected", label: `Rejected (${rejectedRefunds.length})` },
              ]} />
            </div>
          )}

          <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(450px,1fr))]")}>
            {currentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                primary={LEGACY_COLORS.primary}
                muted={LEGACY_COLORS.muted}
                border={LEGACY_COLORS.border}
                text={LEGACY_COLORS.text}
                cardBg={LEGACY_COLORS.cardBg}
                inputBg={LEGACY_COLORS.inputBg}
                onRequestRefund={() => { setSelectedOrder(order); setShowRefundDialog(true); }}
                onApplyRefund={() => handleApproveRefund(order)}
                onRejectRefund={() => handleRejectRefund(order)}
                onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
                isMobile={isMobile}
              />
            ))}
            {currentOrders.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No {activeTab === "refunds" ? (refundSubTab === "requested" ? "refund request" : refundSubTab === "refunded" ? "refunded" : "rejected") : activeTab} orders found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <RefundFormDialog isOpen={showRefundDialog} onClose={() => setShowRefundDialog(false)} order={selectedOrder} reason={refundReason} setReason={setRefundReason} onSubmit={handleRequestRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RejectRefundDialog isOpen={showRejectDialog} onClose={() => setShowRejectDialog(false)} order={orderToReject} reason={rejectReason} setReason={setRejectReason} onSubmit={handleRejectRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <ApproveRefundDialog isOpen={showApproveDialog} onClose={() => setShowApproveDialog(false)} order={orderToApprove} onSubmit={handleApproveRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
    </div>
  );
}
