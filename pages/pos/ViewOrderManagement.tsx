"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseLineIcon } from "@/icons/index";
import { Search, Filter, Loader2, LayoutGrid, List } from "lucide-react";
import { Order, OrderStatus, STATUS_LABELS } from "@/components/module-pos/types";
import OrderCard from "@/components/module-pos/OrderCard";
import RefundFormDialog from "@/components/module-pos/RefundFormDialog";
import VoidFormDialog from "@/components/module-pos/VoidFormDialog";
import RejectRefundDialog from "@/components/module-pos/RejectRefundDialog";
import RejectVoidDialog from "@/components/module-pos/RejectVoidDialog";
import ApproveRefundDialog from "@/components/module-pos/ApproveRefundDialog";
import ApproveVoidDialog from "@/components/module-pos/ApproveVoidDialog";
import OrderFilters from "@/components/module-pos/OrderFilters";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { OrderManagementResponseDto } from "../../components/module-pos/api/api";
import { toast } from "sonner";
import { apiClient } from "@/components/module-pos/api";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { useMyLocations } from "@/lib/useMyLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { user: authUser, isLoading: authLoading, can, canRead } = useAuth();
  const { scope, locations: myLocations } = useMyLocations();

  // Granular RBAC (br-auth "Order Management" module).
  //   read    → may open the Order Management page at all
  //   approve → manager capability (approve/reject refunds, see all channels)
  // A user with read but NOT approve behaves like the old "cashier": limited to
  // POS orders from their branch (plus refund-state items to action).
  const canViewOrders = canRead(POS_MODULES.ORDER_MANAGEMENT);
  const canManageRefunds = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const isCashierLevel = canViewOrders && !canManageRefunds;
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cashierLocationName, setCashierLocationName] = useState<string>("");

  // Only admins/owners (super users, "all" scope) may see or switch between
  // locations. Everyone else is pinned to their assigned branch.
  const canSwitchLocation = scope === "all";
  const assignedLocation = useMemo(
    () => myLocations.find((l) => l.isPrimary) ?? myLocations[0] ?? null,
    [myLocations]
  );

  const [activeTab, setActiveTab] = useState<"pending" | "active" | "completed" | "refunds" | "voids" | "cancelled">("pending");
  const [showManagerPinDialog, setShowManagerPinDialog] = useState(false);
  const [managerPin, setManagerPin] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [refundSubTab, setRefundSubTab] = useState<"requested" | "refunded" | "rejected">("requested");
  const [voidSubTab, setVoidSubTab] = useState<"requested" | "voided" | "rejected">("requested");
  const [channelTab, setChannelTab] = useState<"all" | "pos" | "web">("pos"); // Soft-delete: default to pos
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [remarks, setRemarks] = useState("");
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [showRejectVoidDialog, setShowRejectVoidDialog] = useState(false);
  const [rejectVoidReason, setRejectVoidReason] = useState("");
  const [orderToRejectVoid, setOrderToRejectVoid] = useState<Order | null>(null);
  const [showApproveVoidDialog, setShowApproveVoidDialog] = useState(false);
  const [orderToApproveVoid, setOrderToApproveVoid] = useState<Order | null>(null);

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
    locationId: dto.locationId != null ? Number(dto.locationId) : undefined,
    isPreOrder: !!dto.isPreorder,
    paymentStatus: (dto.paymentStatus?.toLowerCase() as "pending" | "paid") || "pending",
    // Only actual rejection/cancellation reasons belong in "Remarks / Reason".
    // Customization notes are surfaced separately via customVariationNotes.
    remarks: dto.rejectionRemarks || "",
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
      const { data } = await apiClient.apiPos.orderManagementOrdersList(undefined, { headers });
      setOrders(data.map(mapToFrontendOrder));
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { setIsMounted(true); fetchOrders(); }, []);

  // Pin non-super users to their assigned branch. Super users ("all" scope)
  // keep the "All" default and may switch freely via the filters.
  useEffect(() => {
    if (canSwitchLocation) return;
    if (assignedLocation) {
      setCashierLocationName(assignedLocation.locationName || "");
      setFilterLocation(assignedLocation.locationName || "Store");
    }
  }, [canSwitchLocation, assignedLocation]);

  const resetFilters = () => {
    setFilterType("All");
    setFilterStatus("All");
    if (!canSwitchLocation) {
      setFilterLocation(cashierLocationName || "Store");
    } else { setFilterLocation("All"); }
    setSearchQuery("");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const isWebOrder = o.type.toLowerCase() === "online" || o.source?.toLowerCase() === "e-commerce" || o.source?.toLowerCase() === "ecommerce";
      const isRefundStatus = o.status === "refund_requested" || o.status === "refunded";
      // Non-super users only ever see orders from their assigned branch
      // (refund items still surface so they can be actioned). Compare by
      // locationId (reliable) and fall back to the name only if id is absent.
      if (!canSwitchLocation) {
        if (isCashierLevel && isWebOrder && !isRefundStatus) return false;
        const assignedId = assignedLocation?.locationId;
        if (!isRefundStatus && assignedId != null && o.locationId != null) {
          if (o.locationId !== assignedId) return false;
        } else if (!isRefundStatus && cashierLocationName && o.locationId == null) {
          if (o.location.toLowerCase() !== cashierLocationName.toLowerCase()) return false;
        }
      }
      // Soft-delete Web Orders (handled by CRMS now)
      if (isWebOrder) return false;

      if (channelTab === "pos" && isWebOrder && !isRefundStatus) return false;
      if (channelTab === "web" && !isWebOrder) return false;
      if (searchQuery && !o.id.toLowerCase().includes(searchQuery.toLowerCase()) && !o.customer.toLowerCase().includes(searchQuery.toLowerCase()) && !(o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase())) && !(o.date?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (filterType !== "All" && o.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== "All" && o.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (filterLocation !== "All" && o.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      return true;
    });
  }, [orders, channelTab, searchQuery, filterType, filterStatus, filterLocation, authUser, cashierLocationName, canSwitchLocation, isCashierLevel, assignedLocation]);

  const handleApproveVoid = (order: Order) => { setOrderToApproveVoid(order); setShowApproveVoidDialog(true); };

  const handleApproveVoidSubmit = async (pin: string) => {
    if (!orderToApproveVoid) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.instance.put(`/api-pos/order-management/orders/${orderToApproveVoid.id}/approve-void`, { approvedBy: managerId, pinCode: pin }, { headers });
      toast.success("Void approved successfully!");
      fetchOrders();
      setShowApproveVoidDialog(false);
      setOrderToApproveVoid(null);
    } catch (err: any) { 
      console.warn("Failed to approve void:", err?.message || "Unknown error"); 
      const msg = err.response?.data || "Failed to approve void. Check PIN.";
      toast.error(typeof msg === "string" ? msg : "Failed to approve void."); 
    }
  };

  const handleViewManagerPin = async () => {
    setShowManagerPinDialog(true);
    setIsLoadingPin(true);
    try {
      const res = await apiClient.instance.get("/api-pos/user-pin", { headers });
      setManagerPin(res.data.pinCode);
    } catch (err) {
      console.error("Failed to fetch manager PIN:", err);
      toast.error("Failed to fetch manager PIN");
    } finally {
      setIsLoadingPin(false);
    }
  };

  const handleRejectVoid = (order: Order) => { setOrderToRejectVoid(order); setRejectVoidReason(""); setShowRejectVoidDialog(true); };

  const handleRejectVoidSubmit = async (pin: string, reason: string) => {
    if (!orderToRejectVoid) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.instance.put(`/api-pos/order-management/orders/${orderToRejectVoid.id}/reject-void`, { rejectedBy: managerId, rejectionRemarks: reason, pinCode: pin }, { headers });
      toast.success("Void request rejected.");
      fetchOrders();
      setShowRejectVoidDialog(false); 
      setOrderToRejectVoid(null);
    } catch (err: any) { 
      console.warn("Failed to reject void:", err?.message || "Unknown error"); 
      const msg = err.response?.data || "Failed to reject void.";
      toast.error(typeof msg === "string" ? msg : "Failed to reject void."); 
    }
  };

  const handleRequestVoidSubmit = async () => {
    if (!selectedOrder || !voidReason.trim()) return;
    try {
      await apiClient.instance.put(`/api-pos/order-management/orders/${selectedOrder.id}/request-void`, { reason: voidReason }, { headers });
      toast.success("Void requested successfully.");
      fetchOrders();
    } catch (err: any) { 
      console.warn("Failed to request void:", err?.message || "Unknown error"); 
      const msg = err.response?.data || "Failed to request void.";
      toast.error(typeof msg === "string" ? msg : "Failed to request void."); 
    }
    setShowVoidDialog(false); setVoidReason("");
  };

  const handleApproveRefund = (order: Order) => { setOrderToApprove(order); setShowApproveDialog(true); };

  const handleApproveRefundSubmit = async () => {
    if (!orderToApprove) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await apiClient.apiPos.orderManagementOrdersApproveRefundUpdate(Number(orderToApprove.id), { approvedBy: managerId }, { headers });
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
      await apiClient.apiPos.orderManagementOrdersRejectRefundUpdate(Number(orderToReject.id), { rejectedBy: managerId, rejectionRemarks: rejectReason.trim() }, { headers });
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
      await apiClient.apiPos.orderManagementOrdersRequestRefundUpdate(Number(selectedOrder.id), { reason: refundReason }, { headers });
      toast.success(`Refund requested successfully for Order ${selectedOrder.orderNumber || `#${selectedOrder.id}`}.`);
      fetchOrders();
    } catch (err) { console.error("Failed to request refund:", err); toast.error("Failed to request refund."); }
    setShowRefundDialog(false); setRefundReason("");
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      const statusMap: Record<string, string> = { pending: "Pending", awaiting_stock: "Awaiting Stock", processing: "Processing", ready_for_delivery: "Processing", shipped: "Shipped", delivered: "Delivered", completed: "Completed", rejected: "Cancelled", cancelled: "Cancelled", refund_requested: "Refund Requested", refunded: "Refunded" };
      const backendStatus = statusMap[newStatus] || newStatus;
      await apiClient.instance.put(`/api-pos/order-management/orders/${orderId}/status`, { status: backendStatus, updatedBy: 1 }, { headers });
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
  const activeOrders = filteredOrders.filter((o) => o.status !== "pending" && o.status !== "awaiting_stock" && !["completed", "delivered", "rejected", "cancelled", "refund_requested", "refunded", "void_requested", "voided"].includes(o.status));
  const rejectedRefunds = filteredOrders
    .filter((o) => o.status === "completed" && (o.remarks?.toLowerCase().startsWith("refund rejected") || o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed")))
    .map((o) => ({ ...o, status: "rejected" as const }));
  const completedOrders = filteredOrders.filter((o) => ["completed", "delivered"].includes(o.status) && !(o.remarks?.toLowerCase().startsWith("refund rejected") || o.statusHistory?.some(h => h.oldStatus === "Refund Requested" && h.newStatus === "Completed")));
  const refundRequests = filteredOrders.filter((o) => o.status === "refund_requested");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const voidRequests = filteredOrders.filter((o) => o.status === "void_requested");
  const voidedOrders = filteredOrders.filter((o) => o.status === "voided");
  const rejectedVoids = filteredOrders
    .filter((o) => o.status === "completed" && (o.remarks?.toLowerCase().startsWith("void rejected") || o.statusHistory?.some(h => h.oldStatus === "Void Requested" && h.newStatus === "Completed")))
    .map((o) => ({ ...o, status: "rejected" as const }));
  const cancelledOrders = filteredOrders.filter((o) => ["cancelled", "rejected"].includes(o.status));

  const hasAccess = !!authUser && canViewOrders;

  useEffect(() => { if (!authLoading && !hasAccess) router.replace("/access-denied"); }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!hasAccess || !isMounted) return null;

  const statusTabs: { key: typeof activeTab; label: string; count: number; destructive?: boolean }[] = [
    { key: "pending", label: "Pending", count: pendingApproval.length },
    { key: "active", label: "Active", count: activeOrders.length },
    { key: "completed", label: "Completed", count: completedOrders.length },
    { key: "refunds", label: "Refunds", count: refundRequests.length + refundedOrders.length + rejectedRefunds.length, destructive: true },
    { key: "voids", label: "Voids", count: voidRequests.length + voidedOrders.length + rejectedVoids.length, destructive: true },
    { key: "cancelled", label: "Cancelled", count: cancelledOrders.length, destructive: true },
  ];

  const currentOrders = activeTab === "pending" ? pendingApproval : activeTab === "active" ? activeOrders : activeTab === "completed" ? completedOrders : activeTab === "refunds" ? (refundSubTab === "requested" ? refundRequests : refundSubTab === "refunded" ? refundedOrders : rejectedRefunds) : activeTab === "voids" ? (voidSubTab === "requested" ? voidRequests : voidSubTab === "voided" ? voidedOrders : rejectedVoids) : cancelledOrders;

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
          {!isCashierLevel && (
            <button 
              onClick={handleViewManagerPin}
              className="px-3 py-2 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              View My PIN
            </button>
          )}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ID or Date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} maxLength={25} className="pl-10 h-12" />
          </div>
          <div className="flex bg-muted/50 p-1 rounded-xl h-12 shrink-0">
            <button 
              onClick={() => setViewMode("grid")} 
              className={cn("px-3 h-full rounded-lg transition-colors flex items-center justify-center", viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")} 
              className={cn("px-3 h-full rounded-lg transition-colors flex items-center justify-center", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className={cn("h-12 gap-2 rounded-xl text-xs font-bold uppercase", isMobile && "w-full")}>
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>
      </div>

      <OrderFilters show={showFilters} onClose={() => setShowFilters(false)} filterType={filterType} setFilterType={setFilterType} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterLocation={filterLocation} setFilterLocation={setFilterLocation} resetFilters={resetFilters} canSwitchLocation={canSwitchLocation} locationOptions={orders.reduce<string[]>((acc, o) => { if (o.location && o.location !== "Unknown" && !acc.includes(o.location)) acc.push(o.location); return acc; }, [])} />

      {/* Channel Tabs — hidden for cashier-level users (no cross-channel view) */}
      {/* SOFT DELETE: Web Orders are now handled by CRMS
      {!isCashierLevel && (
        <div className="flex border-b border-border overflow-x-auto">
          {(["all", "pos", "web"] as const).map((tab) => (
            <button key={tab} onClick={() => setChannelTab(tab)} className={cn("px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors", channelTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab === "all" ? "All Orders" : tab === "pos" ? "POS Orders" : "Web Orders"}
            </button>
          ))}
        </div>
      )}
      */}

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

          {activeTab === "voids" && (
            <div className="w-full max-w-xs">
              <CustomSelect value={voidSubTab} onChange={(val) => setVoidSubTab(val as "requested" | "voided" | "rejected")} className="w-full max-w-xs" options={[
                { value: "requested", label: `Void Requests (${voidRequests.length})` },
                { value: "voided", label: `Voided (${voidedOrders.length})` },
                { value: "rejected", label: `Rejected (${rejectedVoids.length})` },
              ]} />
            </div>
          )}

          <div className={cn(
            viewMode === "grid" 
              ? cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(450px,1fr))]")
              : "flex flex-col gap-4 w-full"
          )}>
            {viewMode === "list" && currentOrders.length > 0 ? (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID & Location</th>
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
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
                        onRequestVoid={() => { setSelectedOrder(order); setShowVoidDialog(true); }}
                        onApplyVoid={() => handleApproveVoid(order)}
                        onRejectVoid={() => handleRejectVoid(order)}
                        onApplyRefund={() => handleApproveRefund(order)}
                        onRejectRefund={() => handleRejectRefund(order)}
                        onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
                        isMobile={isMobile}
                        viewMode="list"
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              currentOrders.map((order) => (
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
                  onRequestVoid={() => { setSelectedOrder(order); setShowVoidDialog(true); }}
                  onApplyVoid={() => handleApproveVoid(order)}
                  onRejectVoid={() => handleRejectVoid(order)}
                  onApplyRefund={() => handleApproveRefund(order)}
                  onRejectRefund={() => handleRejectRefund(order)}
                  onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
                  isMobile={isMobile}
                  viewMode="grid"
                />
              ))
            )}
            {currentOrders.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No {activeTab === "refunds" ? (refundSubTab === "requested" ? "refund request" : refundSubTab === "refunded" ? "refunded" : "rejected") : activeTab === "voids" ? (voidSubTab === "requested" ? "void request" : "voided") : activeTab} orders found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
            <VoidFormDialog isOpen={showVoidDialog} onClose={() => setShowVoidDialog(false)} order={selectedOrder} reason={voidReason} setReason={setVoidReason} onSubmit={handleRequestVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RejectVoidDialog isOpen={showRejectVoidDialog} onClose={() => setShowRejectVoidDialog(false)} order={orderToRejectVoid} onSubmit={handleRejectVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <ApproveVoidDialog isOpen={showApproveVoidDialog} onClose={() => setShowApproveVoidDialog(false)} order={orderToApproveVoid} onSubmit={handleApproveVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RefundFormDialog isOpen={showRefundDialog} onClose={() => setShowRefundDialog(false)} order={selectedOrder} reason={refundReason} setReason={setRefundReason} onSubmit={handleRequestRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RejectRefundDialog isOpen={showRejectDialog} onClose={() => setShowRejectDialog(false)} order={orderToReject} reason={rejectReason} setReason={setRejectReason} onSubmit={handleRejectRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <ApproveRefundDialog isOpen={showApproveDialog} onClose={() => setShowApproveDialog(false)} order={orderToApprove} onSubmit={handleApproveRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />

      {/* View Manager PIN Dialog */}
      {showManagerPinDialog && createPortal(
        <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="w-[90vw] sm:w-[400px] rounded-2xl shadow-xl border flex flex-col max-h-[90vh]"
            style={{ background: LEGACY_COLORS.cardBg, borderColor: LEGACY_COLORS.border }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b sticky top-0 z-10 rounded-t-2xl"
              style={{ borderColor: LEGACY_COLORS.border, background: LEGACY_COLORS.cardBg }}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold" style={{ color: LEGACY_COLORS.text }}>
                  Manager PIN
                </h2>
              </div>
              <button 
                onClick={() => setShowManagerPinDialog(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <CloseLineIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Use this PIN to approve Void and Refund requests. Keep this secure!
              </p>
              
              <div className="py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                {isLoadingPin ? (
                  <div className="h-8 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <span className="text-3xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                    {managerPin}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div 
              className="p-4 sm:p-5 border-t mt-auto flex justify-end gap-3 sticky bottom-0 rounded-b-2xl"
              style={{ borderColor: LEGACY_COLORS.border, background: LEGACY_COLORS.cardBg }}
            >
              <button
                onClick={() => setShowManagerPinDialog(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[#18181b] text-white hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

