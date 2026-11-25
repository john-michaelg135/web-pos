"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { DeliveryConfirmationInput, Order, OrderStatus, REFUND_METHOD_HINT, STATUS_LABELS, SubmitOutcome, latestRefundWasRejected, pendingRefundLines, refundMethodOf } from "@/components/module-pos/types";
import OrderCard from "@/components/module-pos/OrderCard";
import RefundFormDialog from "@/components/module-pos/RefundFormDialog";
import type { ProofPayload } from "@/components/module-pos/ProofPhotoPicker";
import VoidFormDialog from "@/components/module-pos/VoidFormDialog";
import RejectRefundDialog from "@/components/module-pos/RejectRefundDialog";
import RejectVoidDialog from "@/components/module-pos/RejectVoidDialog";
import ApproveRefundDialog from "@/components/module-pos/ApproveRefundDialog";
import ApproveVoidDialog from "@/components/module-pos/ApproveVoidDialog";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { OrderManagementResponseDto, RefundItemDto } from "../../components/module-pos/api/api";
import { toast, type ToastDetail } from "@/lib/toast";
import { parseVariationName } from "@/components/module-pos/utils";
import { apiClient } from "@/components/module-pos/api";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { useMyLocations } from "@/lib/useMyLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { orderTablePageSize } from "@/lib/orderTablePageSize";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

import { Bone, orderListColumns, OrderListSkeleton, OrderManagementSkeleton } from "@/components/shared/PageSkeleton";

// Legacy color props for child components that haven't been rewritten yet
const LEGACY_COLORS = {
  primary: "#5b2a86",
  muted: "#71717a",
  border: "#e4e4e7",
  text: "#18181b",
  cardBg: "#ffffff",
  inputBg: "#fafafa",
};

type OrderTab = "active" | "paid" | "completed" | "refunds" | "voids" | "cancelled";
type RefundSubTab = "requested" | "refunded" | "rejected";
type VoidSubTab = "requested" | "voided" | "rejected";

// Preserve the original order and show each order once, including partial refunds
// that also have a later rejected request.
function combineOrderGroups(orders: Order[], groups: Record<string, Order[]>) {
  const byId = new Map(Object.values(groups).flat().map((order) => [order.id, order]));
  return orders.flatMap((order) => byId.get(order.id) ?? []);
}

function OrderStatusFilter<T extends string>({ value, onChange, options }: {
  value: T | "all";
  onChange: (value: T | "all") => void;
  options: { value: T; label: string; count: number }[];
}) {
  return (
    <CustomSelect
      value={value}
      onChange={(selected) => onChange(options.find((option) => option.value === selected)?.value ?? "all")}
      compact
      options={[
        { value: "all", label: "All Statuses" },
        ...options.map(({ value, label, count }) => ({ value, label: `${label} (${count})` })),
      ]}
    />
  );
}

const voidWasRejected = (o: Order) =>
  !!(o.remarks?.toLowerCase().startsWith("void rejected") || o.statusHistory?.some((h) => h.oldStatus === "Void Requested" && h.newStatus === "Completed"));

/** The tab (and sub-tab) that lists an order, so a notification link can open it there. */
function tabForOrder(o: Order): { tab: OrderTab; refund?: RefundSubTab; void?: VoidSubTab } {
  if (o.status === "refund_requested") return { tab: "refunds", refund: "requested" };
  if (o.status === "void_requested") return { tab: "voids", void: "requested" };
  if (o.status === "voided") return { tab: "voids", void: "voided" };
  if (o.status === "refunded" || (o.refundedAmount ?? 0) > 0) return { tab: "refunds", refund: "refunded" };
  if (o.status === "completed" && latestRefundWasRejected(o)) return { tab: "refunds", refund: "rejected" };
  if (o.status === "completed" && voidWasRejected(o)) return { tab: "voids", void: "rejected" };
  if (o.status === "paid") return { tab: "paid" };
  if (o.status === "completed" || o.status === "delivered") return { tab: "completed" };
  if (o.status === "cancelled" || o.status === "rejected") return { tab: "cancelled" };
  return { tab: "active" };
}

const peso = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const orderLabel = (order: Order) => order.orderNumber || `#${order.id}`;
/** A pop-up product line: name, packaging and size (the SKU is left out). */
const productOf = (item: Order["items"][number]): NonNullable<ToastDetail["item"]> => {
  const { packaging, size } = parseVariationName(item.variation);
  // A variation without "SKU|Packaging|Size" parts (e.g. "Standard") is shown as is.
  return { name: item.name, packaging: packaging || (item.variation.includes("|") ? "" : item.variation), size };
};
/** One pop-up row per item, e.g. "Ube Halaya Smooth  Pouch  250g  +1 restocked". */
const itemRows = (items: Order["items"], value: (item: Order["items"][number]) => string, tone: ToastDetail["tone"]): ToastDetail[] =>
  items.map((item) => ({ item: productOf(item), value: value(item), tone }));

export default function ViewOrderManagement() {
  const { user: authUser, isLoading: authLoading, can, canRead } = useAuth();
  const { scope, locations: myLocations, isLoading: locationsLoading } = useMyLocations();

  // Granular RBAC (br-auth "Order Management" module).
  //   read    → may open the Order Management page at all
  //   approve → manager capability (approve/reject refunds, see all channels)
  // A user with read but NOT approve behaves like the old "cashier": limited to
  // POS orders from their branch (plus refund-state items to action).
  const canViewOrders = canRead(POS_MODULES.ORDER_MANAGEMENT);
  const canManageRefunds = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const isCashierLevel = canViewOrders && !canManageRefunds;
  const router = useRouter();
  const searchParams = useSearchParams();
  // A notification opened this page for one order (?orderId=…): show just that order until cleared.
  const linkedOrderId = searchParams?.get("orderId") ?? null;
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const [handledOrderLink, setHandledOrderLink] = useState<string | null>(null);
  const [linkedOrderMissing, setLinkedOrderMissing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cashierLocationName, setCashierLocationName] = useState<string>("");

  // Only admins/owners (super users, "all" scope) may see or switch between
  // locations. Everyone else is pinned to their assigned branch.
  const canSwitchLocation = scope === "all";
  const assignedLocation = useMemo(
    () => myLocations.find((l) => l.isPrimary) ?? myLocations[0] ?? null,
    [myLocations]
  );
  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (assignedLocation?.locationId) {
      h["X-Location-Id"] = String(assignedLocation.locationId);
    }
    return h;
  }, [assignedLocation?.locationId]);

  const [activeTab, setActiveTab] = useState<"active" | "paid" | "completed" | "refunds" | "voids" | "cancelled">("active");
  const [showManagerPinDialog, setShowManagerPinDialog] = useState(false);
  const [managerPin, setManagerPin] = useState<string | null>(null);
  const [managerPinError, setManagerPinError] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const pinRequestInFlight = useRef(false);
  const [activeStatus, setActiveStatus] = useState<"all" | "processing" | "shipped">("all");
  const [refundSubTab, setRefundSubTab] = useState<RefundSubTab | "all">("all");
  const [voidSubTab, setVoidSubTab] = useState<VoidSubTab | "all">("all");
  const [channelTab, setChannelTab] = useState<"all" | "pos" | "web">("pos"); // Soft-delete: default to pos

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const locationIndicator = locationsLoading
    ? "Loading location..."
    : canSwitchLocation
      ? filterLocation === "All"
        ? "All Locations"
        : filterLocation.toLowerCase().startsWith("store")
          ? filterLocation
          : `Store - ${filterLocation}`
      : assignedLocation
        ? assignedLocation.locationName.toLowerCase().startsWith("store")
          ? assignedLocation.locationName
          : `Store - ${assignedLocation.locationName}`
        : "No location assigned";

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
      ? dto.items.map((i) => ({
          variationId: i.variationId != null ? Number(i.variationId) : undefined,
          name: i.productName || "Order Item",
          variation: i.variationName || "Standard",
          quantity: Number(i.quantity) || 1,
          price: Number(i.unitPrice) || 0,
          refundedQuantity: Number((i as { refundedQuantity?: number }).refundedQuantity) || 0,
          pendingRefundQuantity: Number((i as { pendingRefundQuantity?: number }).pendingRefundQuantity) || 0,
        }))
      : [{ name: "Order Items", variation: "Mixed", quantity: 1, price: Number(dto.totalAmount) || 0 }],
    total: Number(dto.totalAmount) || 0,
    status: (dto.orderStatus?.toLowerCase().replace(" ", "_") as OrderStatus) || "pending",
    date: new Date(dto.createdAt || new Date()).toLocaleDateString(),
    location: dto.locationName || "Unknown",
    locationId: dto.locationId != null ? Number(dto.locationId) : undefined,
    isPreOrder: !!dto.isPreorder,
    paymentStatus: (dto.paymentStatus?.toLowerCase() as "pending" | "partial" | "paid") || "pending",
    paymentMethod: dto.paymentMethod || undefined,
    amountPaid: (dto.payments ?? []).filter(p => p.paymentStatus === "Success").reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0),
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
      ? (dto as any).statusHistory.map((h: any) => ({ id: h.id, orderId: h.orderId, oldStatus: h.oldStatus, newStatus: h.newStatus, changedBy: h.changedBy, changedByName: h.changedByName ?? null, remarks: h.remarks, createdAt: h.createdAt }))
      : [],
    createdAt: dto.createdAt || undefined,
    deliveryConfirmation: (dto as any).deliveryConfirmation ?? null,
    hasRefundProof: !!(dto as any).hasRefundProof,
    refundProofPending: !!(dto as any).refundProofPending,
    refundedAmount: Number((dto as any).refundedAmount) || 0,
    pendingRefundAmount: Number((dto as any).pendingRefundAmount) || 0,
    requestedByCurrentUser: !!(dto as any).requestedByCurrentUser,
    refundMethod: (dto as any).refundMethod === "GCash" ? "GCash" : (dto as any).refundMethod === "Cash" ? "Cash" : undefined,
    refundDeadline: (dto as any).refundDeadline ?? null,
  });

  const fetchOrders = useCallback(async (targetLocId?: number) => {
    try {
      setIsLoading(true);
      const locId = targetLocId ?? assignedLocation?.locationId;
      const reqHeaders = {
        ...headers,
        ...(locId ? { "X-Location-Id": String(locId) } : {}),
      };
      const queryParams = !canSwitchLocation && locId ? { LocationId: locId } : {};
      const { data } = await apiClient.apiPos.orderManagementOrdersList(queryParams, { headers: reqHeaders });
      setOrders(data.map(mapToFrontendOrder));
      setHasLoadedOrders(true);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [assignedLocation?.locationId, canSwitchLocation, headers]);

  const requestManagerEndpoint = async (path: string, body?: unknown) => {
    const response = await fetch(`/api/pos/${path}`, {
      method: body === undefined ? "GET" : "PUT",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(25_000),
    });
    const responseBody = await response.text();
    let data: { message?: string } | null = null;
    try {
      data = JSON.parse(responseBody) as { message?: string };
    } catch {
      data = null;
    }
    if (!response.ok) {
      throw new Error(
        typeof data?.message === "string"
          ? data.message
          : responseBody.trim() || `Request failed (${response.status}).`,
      );
    }
    if (!responseBody) return null;
    try {
      return JSON.parse(responseBody) as unknown;
    } catch {
      throw new Error("The POS API returned an invalid response.");
    }
  };

  useEffect(() => { setIsMounted(true); }, []);

  // Wait for location scope before fetching so an unscoped initial response
  // cannot be replaced by a narrower branch response after it renders.
  useEffect(() => {
    if (locationsLoading) return;
    if (!canSwitchLocation && !assignedLocation?.locationId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    void fetchOrders(assignedLocation?.locationId);
  }, [
    assignedLocation?.locationId,
    canSwitchLocation,
    fetchOrders,
    locationsLoading,
  ]);

  // Pin non-super users to their assigned branch. Super users ("all" scope)
  // see all branches.
  useEffect(() => {
    if (canSwitchLocation) return;
    if (assignedLocation) {
      setCashierLocationName(assignedLocation.locationName || "");
      setFilterLocation(assignedLocation.locationName || "Store");
    }
  }, [canSwitchLocation, assignedLocation]);

  // A notification selects the matching order across the full branch history.
  if (linkedOrderId !== handledOrderLink) {
    if (!linkedOrderId) {
      setHandledOrderLink(null);
      setFocusOrderId(null);
      setLinkedOrderMissing(false);
    } else if (!isLoading && hasLoadedOrders) {
      const order = orders.find((o) => o.id === linkedOrderId);
      setHandledOrderLink(linkedOrderId);
      setFocusOrderId(order?.id ?? null);
      setLinkedOrderMissing(!order);
      if (order) {
        const { tab, refund, void: voidSub } = tabForOrder(order);
        setActiveTab(tab);
        if (tab === "active") setActiveStatus("all");
        if (refund) setRefundSubTab(refund);
        if (voidSub) setVoidSubTab(voidSub);
        setSearchQuery("");
        setFilterType("All");
      }
    }
  }

  const clearFocusedOrder = () => {
    setFocusOrderId(null);
    setLinkedOrderMissing(false);
    router.replace("/order-management");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (focusOrderId && o.id !== focusOrderId) return false;
      // Pending orders are hidden everywhere: sales complete at the counter, so only
      // leftovers from the old online-payment flow are still Pending.
      if (o.status === "pending") return false;
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
      const channel = o.type === "store" ? "walk-in" : o.type;
      if (filterType !== "All" && channel !== filterType.toLowerCase()) return false;
      if (filterLocation !== "All") {
        const matchesName = o.location && o.location.toLowerCase() === filterLocation.toLowerCase();
        const matchesAssigned = assignedLocation?.locationId != null && o.locationId === assignedLocation.locationId;
        if (!matchesName && !matchesAssigned) return false;
      }
      return true;
    });
  }, [orders, focusOrderId, channelTab, searchQuery, filterType, filterLocation, authUser, cashierLocationName, canSwitchLocation, isCashierLevel, assignedLocation]);

  const handleApproveVoid = (order: Order) => { setOrderToApproveVoid(order); setShowApproveVoidDialog(true); };

  const handleApproveVoidSubmit = async (pin: string) => {
    if (!orderToApproveVoid) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await requestManagerEndpoint(`order-management/orders/${orderToApproveVoid.id}/approve-void`, { approvedBy: managerId, pinCode: pin });
      toast.success({
        title: "Void approved",
        meta: `${orderLabel(orderToApproveVoid)} · −${peso(orderToApproveVoid.total)}`,
        details: itemRows(orderToApproveVoid.items, (item) => `+${item.quantity} restocked`, "positive"),
      });
      fetchOrders();
      setShowApproveVoidDialog(false);
      setOrderToApproveVoid(null);
    } catch (err: any) { 
      console.warn("Failed to approve void:", err?.message || "Unknown error"); 
      toast.error(err instanceof Error ? err.message : "Failed to approve void. Check PIN.");
    }
  };

  const handleViewManagerPin = async () => {
    if (pinRequestInFlight.current) return;
    pinRequestInFlight.current = true;
    setManagerPin(null);
    setManagerPinError(null);
    setShowManagerPinDialog(true);
    setIsLoadingPin(true);
    try {
      const res = await requestManagerEndpoint("user-pin");
      if (
        typeof res !== "object" ||
        res === null ||
        !("pinCode" in res) ||
        typeof res.pinCode !== "string" ||
        !res.pinCode
      ) {
        throw new Error("The API returned an invalid manager PIN response.");
      }
      setManagerPin(res.pinCode);
    } catch (err) {
      console.error("Failed to fetch manager PIN:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch manager PIN.";
      setManagerPinError(message);
      toast.error(message);
    } finally {
      pinRequestInFlight.current = false;
      setIsLoadingPin(false);
    }
  };

  const handleRejectVoid = (order: Order) => { setOrderToRejectVoid(order); setRejectVoidReason(""); setShowRejectVoidDialog(true); };

  const handleRejectVoidSubmit = async (pin: string, reason: string) => {
    if (!orderToRejectVoid) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await requestManagerEndpoint(`order-management/orders/${orderToRejectVoid.id}/reject-void`, { rejectedBy: managerId, rejectionRemarks: reason, pinCode: pin });
      toast.success({
        title: "Void request rejected",
        meta: `${orderLabel(orderToRejectVoid)} · sale stands`,
      });
      fetchOrders();
      setShowRejectVoidDialog(false); 
      setOrderToRejectVoid(null);
    } catch (err: any) { 
      console.warn("Failed to reject void:", err?.message || "Unknown error"); 
      toast.error(err instanceof Error ? err.message : "Failed to reject void.");
    }
  };

  const handleRequestVoidSubmit = async () => {
    if (!selectedOrder || !voidReason.trim()) return;
    try {
      await requestManagerEndpoint(`order-management/orders/${selectedOrder.id}/request-void`, { reason: voidReason });
      toast.success({
        title: "Void requested",
        meta: `${orderLabel(selectedOrder)} · ${peso(selectedOrder.total)}`,
        note: "A manager has to approve it before the sale is voided.",
      });
      fetchOrders();
    } catch (err: any) { 
      console.warn("Failed to request void:", err?.message || "Unknown error"); 
      toast.error(err instanceof Error ? err.message : "Failed to request void.");
    }
    setShowVoidDialog(false); setVoidReason("");
  };

  const handleApproveRefund = (order: Order) => { setOrderToApprove(order); setShowApproveDialog(true); };

  const handleApproveRefundSubmit = async (pin: string) => {
    if (!orderToApprove) return;
    try {
      const managerId = Number(authUser?.id) || 1;
      await requestManagerEndpoint(`order-management/orders/${orderToApprove.id}/approve-refund`, { approvedBy: managerId, pinCode: pin });
      // Mirrors the backend: "(Unsellable)" reasons are refunded without restocking.
      const reasonText = orderToApprove.remarks?.toLowerCase() ?? "";
      const isUnsellable = reasonText.includes("(unsellable)") || reasonText.startsWith("damaged/expired");
      const refunded = pendingRefundLines(orderToApprove);
      const refundedAmount = refunded.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const isPartial = refunded.reduce((sum, item) => sum + item.quantity, 0)
        < orderToApprove.items.reduce((sum, item) => sum + item.quantity - (item.refundedQuantity ?? 0), 0);
      toast.success(
        {
          title: isPartial ? "Partial refund approved" : "Refund approved",
          meta: `${orderLabel(orderToApprove)} · −${peso(refundedAmount)} · ${refundMethodOf(orderToApprove)}`,
          details: isUnsellable
            ? itemRows(refunded, (item) => `${item.quantity} written off`, "negative")
            : itemRows(refunded, (item) => `+${item.quantity} restocked`, "positive"),
          note: [
            `${REFUND_METHOD_HINT[refundMethodOf(orderToApprove)]}: ${peso(refundedAmount)}.`,
            isUnsellable ? "Unsellable items aren't returned to stock." : null,
          ].filter(Boolean).join(" "),
        },
        { duration: 8000 },
      );
      fetchOrders();
      setShowApproveDialog(false);
      setOrderToApprove(null);
    } catch (err: any) { 
      console.warn("Failed to approve refund:", err?.message || "Unknown error"); 
      toast.error(err instanceof Error ? err.message : "Failed to approve refund. Check PIN.");
    }
  };

  const handleRejectRefund = (order: Order) => { setOrderToReject(order); setShowRejectDialog(true); };

  const handleRejectRefundSubmit = async (pin: string, reason: string) => {
    if (!orderToReject) return;
    if (!reason.trim()) { toast.error("Reason is required."); return; }
    if (reason.trim().length > 500) { toast.error("Reason must not exceed 500 characters."); return; }
    if (/[<>]/.test(reason)) { toast.error("Reason cannot contain HTML characters (<, >)."); return; }
    try {
      const managerId = Number(authUser?.id) || 1;
      await requestManagerEndpoint(`order-management/orders/${orderToReject.id}/reject-refund`, { rejectedBy: managerId, rejectionRemarks: reason.trim(), pinCode: pin });
      toast.success({
        title: "Refund request rejected",
        meta: `${orderLabel(orderToReject)} · sale stands`,
      });
      fetchOrders();
      setShowRejectDialog(false);
      setOrderToReject(null);
    } catch (err: any) { 
      console.warn("Failed to reject refund:", err?.message || "Unknown error"); 
      toast.error(err instanceof Error ? err.message : "Failed to reject refund. Check PIN.");
    }
  };

  const handleRequestRefundSubmit = async (proof: ProofPayload, items: RefundItemDto[] | undefined): Promise<SubmitOutcome> => {
    if (!selectedOrder || !refundReason.trim()) return { ok: false };
    if (refundReason.trim().length > 500) { toast.error("Reason must not exceed 500 characters."); return { ok: false }; }
    if (/[<>]/.test(refundReason)) { toast.error("Reason cannot contain HTML characters (<, >)."); return { ok: false }; }
    if (items && items.length === 0) { toast.error("Choose at least one item to refund."); return { ok: false }; }
    try {
      // proof is { proofReference } (file storage), { proofImage } (legacy rollback) or nothing.
      const saved = await requestManagerEndpoint(`order-management/orders/${selectedOrder.id}/request-refund`, { reason: refundReason, ...proof, items }) as { refundProofPending?: boolean } | null;
      const requested = items
        ? items.map((line) => {
            const item = selectedOrder.items.find((i) => i.variationId === line.variationId);
            return { item: item ? productOf(item) : undefined, label: "Item", value: `×${line.quantity}`, price: (item?.price ?? 0) * line.quantity };
          })
        : null;
      toast.success({
        title: "Refund requested",
        meta: `${orderLabel(selectedOrder)} · ${peso(requested ? requested.reduce((sum, r) => sum + r.price, 0) : selectedOrder.total)}`,
        details: requested?.map(({ item, label, value }) => ({ item, label, value })),
        note: saved?.refundProofPending
          ? "A manager has to approve it before anything is refunded. The photo is saved and still finishing in storage."
          : "A manager has to approve it before anything is refunded.",
      });
      fetchOrders();
      setShowRefundDialog(false); setRefundReason("");
      return { ok: true };
    } catch (err) {
      // Keep the dialog (and its attached photo) open so the request can be fixed and sent again.
      const message = err instanceof Error && err.message ? err.message : "Failed to request refund.";
      console.error("Failed to request refund:", message);
      toast.error(message);
      return { ok: false, message };
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      const statusMap: Record<string, string> = { pending: "Pending", awaiting_stock: "Awaiting Stock", processing: "Processing", paid: "Paid", ready_for_delivery: "Processing", shipped: "Shipped", delivered: "Delivered", completed: "Completed", rejected: "Cancelled", cancelled: "Cancelled", refund_requested: "Refund Requested", refunded: "Refunded" };
      const backendStatus = statusMap[newStatus] || newStatus;
      await requestManagerEndpoint(`order-management/orders/${orderId}/status`, { status: backendStatus, updatedBy: 1 });
      const order = orders.find(o => o.id === orderId);
      if ((newStatus === "cancelled" || backendStatus === "Cancelled" || newStatus === "refunded" || backendStatus === "Refunded") && order) {
        toast.success(
          {
            title: `${orderLabel(order)} ${STATUS_LABELS[newStatus]?.toLowerCase() ?? "updated"}`,
            meta: "Order status updated",
            details: itemRows(order.items, (item) => `+${item.quantity} restocked`, "positive"),
          },
          { duration: 7000 },
        );
      } else {
        toast.success({ title: order ? `${orderLabel(order)} updated` : "Order updated", meta: `Now ${STATUS_LABELS[newStatus] ?? newStatus}` });
      }
      fetchOrders();
      return true;
    } catch (err) { console.error("Failed to update order status:", err); toast.error(err instanceof Error && err.message ? err.message : "Failed to update order status."); return false; }
  };

  // Institutional GCash downpayment: the remaining balance has reflected in the company wallet.
  const completePayment = async (orderId: string): Promise<boolean> => {
    try {
      await requestManagerEndpoint(`order-management/orders/${orderId}/complete-payment`, {});
      const paidOrder = orders.find((o) => o.id === orderId);
      toast.success({
        title: "Payment completed",
        meta: paidOrder ? `${orderLabel(paidOrder)} · ${peso(paidOrder.total)} paid` : "Fully paid",
        note: "The order is ready for shipment.",
      });
      fetchOrders();
      return true;
    } catch (err) {
      console.error("Failed to complete payment:", err);
      toast.error(err instanceof Error && err.message ? err.message : "Failed to complete payment.");
      return false;
    }
  };

  // Institutional: Shipped → Completed with proof of delivery.
  const confirmDelivery = async (orderId: string, details: DeliveryConfirmationInput): Promise<SubmitOutcome> => {
    try {
      const managerId = Number(authUser?.id) || 1;
      const saved = await requestManagerEndpoint(`order-management/orders/${orderId}/confirm-institutional-delivery`, { ...details, confirmedBy: managerId }) as
        { deliveryConfirmation?: { proofPending?: boolean } | null } | null;
      const deliveredOrder = orders.find((o) => o.id === orderId);
      toast.success({
        title: "Delivery confirmed",
        meta: deliveredOrder ? `${orderLabel(deliveredOrder)} · completed` : "Order completed",
        note: saved?.deliveryConfirmation?.proofPending ? "The photo is saved and still finishing in storage." : undefined,
      });
      fetchOrders();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Failed to confirm delivery.";
      console.error("Failed to confirm delivery:", message);
      toast.error(message);
      return { ok: false, message };
    }
  };

  // There is no Pending tab, and Pending orders are filtered out above; pre-orders awaiting
  // stock are listed under Active.
  const activeOrders = filteredOrders.filter((o) => !["paid", "completed", "delivered", "rejected", "cancelled", "refund_requested", "refunded", "void_requested", "voided"].includes(o.status));
  const activeGroups = {
    processing: activeOrders.filter((order) => order.status === "processing"),
    shipped: activeOrders.filter((order) => order.status === "shipped"),
  };
  const rejectedRefunds = filteredOrders
    .filter((o) => o.status === "completed" && latestRefundWasRejected(o))
    .map((o) => ({ ...o, status: "rejected" as const }));
  const completedOrders = filteredOrders.filter((o) => ["completed", "delivered"].includes(o.status) && !latestRefundWasRejected(o));
  const paidOrders = filteredOrders.filter((o) => o.status === "paid");
  const refundRequests = filteredOrders.filter((o) => o.status === "refund_requested");
  // Fully refunded orders, plus orders with some items refunded (those stay Completed too).
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded" || (o.status !== "refund_requested" && (o.refundedAmount ?? 0) > 0));
  const voidRequests = filteredOrders.filter((o) => o.status === "void_requested");
  const voidedOrders = filteredOrders.filter((o) => o.status === "voided");
  const rejectedVoids = filteredOrders
    .filter((o) => o.status === "completed" && (o.remarks?.toLowerCase().startsWith("void rejected") || o.statusHistory?.some(h => h.oldStatus === "Void Requested" && h.newStatus === "Completed")))
    .map((o) => ({ ...o, status: "rejected" as const }));
  const cancelledOrders = filteredOrders.filter((o) => ["cancelled", "rejected"].includes(o.status));

  const refundGroups = { requested: refundRequests, refunded: refundedOrders, rejected: rejectedRefunds };
  const voidGroups = { requested: voidRequests, voided: voidedOrders, rejected: rejectedVoids };
  const allRefunds = combineOrderGroups(filteredOrders, refundGroups);
  const allVoids = combineOrderGroups(filteredOrders, voidGroups);

  const hasAccess = !!authUser && canViewOrders;

  useEffect(() => { if (!authLoading && !hasAccess) router.replace("/no-access"); }, [authUser, authLoading, hasAccess, router]);

  const statusTabs: { key: typeof activeTab; label: string; count: number; destructive?: boolean }[] = [
    { key: "active", label: "Active", count: activeOrders.length },
    { key: "paid", label: "Paid", count: paidOrders.length },
    { key: "completed", label: "Completed", count: completedOrders.length },
    { key: "refunds", label: "Refunds", count: allRefunds.length, destructive: true },
    { key: "voids", label: "Voids", count: allVoids.length, destructive: true },
    { key: "cancelled", label: "Cancelled", count: cancelledOrders.length, destructive: true },
  ];

  const currentOrders = {
    active: activeStatus === "all" ? activeOrders : activeGroups[activeStatus],
    paid: paidOrders,
    completed: completedOrders,
    refunds: refundSubTab === "all" ? allRefunds : refundGroups[refundSubTab],
    voids: voidSubTab === "all" ? allVoids : voidGroups[voidSubTab],
    cancelled: cancelledOrders,
  }[activeTab];

  const resultsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [pageSize, setPageSize] = useState(1);
  const hasRows = currentOrders.length > 0;
  useLayoutEffect(() => {
    const results = resultsRef.current;
    const footer = footerRef.current;
    if (!results || !footer || !hasRows) return;
    const main = results.closest("main");
    const measure = () => {
      const row = results.querySelector("tbody tr");
      if (!row) {
        // Large order cards vary in height. Page through one grid row at a time.
        const columns = getComputedStyle(results).gridTemplateColumns;
        setPageSize(columns === "none" ? 1 : Math.max(1, columns.split(" ").length));
        return;
      }
      setPageSize(orderTablePageSize(row, footer));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(results);
    observer.observe(footer);
    if (main) observer.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasRows, isLoading, isMounted, authLoading, hasAccess, activeTab, isMobile, focusOrderId, linkedOrderMissing]);

  const filterKey = JSON.stringify([activeTab, activeStatus, refundSubTab, voidSubTab, channelTab, searchQuery, filterType, filterLocation, focusOrderId, assignedLocation?.locationId, isMobile]);
  const [pagination, setPagination] = useState({ filterKey, page: 1 });
  const pageCount = Math.max(1, Math.ceil(currentOrders.length / pageSize));
  const page = pagination.filterKey === filterKey ? Math.min(pagination.page, pageCount) : 1;
  if (pagination.filterKey !== filterKey || pagination.page !== page) {
    setPagination({ filterKey, page });
  }
  const offset = (page - 1) * pageSize;
  const pageOrders = currentOrders.slice(offset, offset + pageSize);

  if (authLoading) return <OrderManagementSkeleton />;
  if (!hasAccess) return null;
  if (!isMounted) return <OrderManagementSkeleton />;

  const paginationFooter = (
    <nav ref={footerRef} aria-label="Order pages" className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
      <span aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
        {currentOrders.length ? `Showing ${(offset + 1).toLocaleString()}–${(offset + pageOrders.length).toLocaleString()} of ${currentOrders.length.toLocaleString()}` : "Showing 0 of 0"}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPagination({ filterKey, page: page - 1 })}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPagination({ filterKey, page: page + 1 })}>Next</Button>
      </div>
    </nav>
  );

  return (
    <div className="w-full min-h-full px-4 pt-8 pb-4 md:px-5 space-y-3 animate-page-in">
      {/* Header */}
      <div className={cn("mx-2 flex justify-between gap-5 pb-3 md:mx-3", isMobile ? "flex-col gap-4" : "items-center")}>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-headline-md font-bold tracking-tight text-foreground">Order Management</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-muted-foreground">Track and manage all orders</p>
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-bold">
                {locationIndicator}
              </Badge>
            </div>
          </div>
          {isMobile && !isCashierLevel && (
            <button
              onClick={handleViewManagerPin}
              disabled={isLoadingPin}
              aria-label="View my PIN"
              className="h-10 px-3 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              PIN
            </button>
          )}
        </div>
        <div className={cn("flex items-center gap-3", (isMobile || isCashierLevel) && "hidden")}>
          {!isMobile && !isCashierLevel && (
            <button
              onClick={handleViewManagerPin}
              disabled={isLoadingPin}
              className="px-3 py-2 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              View My PIN
            </button>
          )}
        </div>
      </div>


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

      {(focusOrderId || linkedOrderMissing) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-foreground">
            {linkedOrderMissing ? (
              "The order from your notification is no longer in your list."
            ) : (
              <>
                Showing the order from your notification
                {(() => {
                  const o = orders.find((x) => x.id === focusOrderId);
                  return o ? <span className="font-semibold"> {orderLabel(o)}</span> : null;
                })()}
                .
              </>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={clearFocusedOrder}>Show all orders</Button>
        </div>
      )}

      {/* Status Tabs */}
      <div role="tablist" className={cn(
        "flex overflow-x-auto gap-1",
        isMobile && "-mx-4 px-4 scroll-px-4 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      )}>
        {statusTabs.map(({ key, label, count, destructive }) => {
          const selected = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(key)}
              className={cn(
                "shrink-0 snap-start inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs whitespace-nowrap transition-colors",
                selected && !destructive && "bg-primary/10 text-primary font-medium",
                selected && destructive && "bg-destructive/10 text-destructive font-medium",
                !selected && "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {label}
              <span className={cn(
                "min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[10px] tabular-nums",
                selected ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label="Order results" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative w-full sm:w-80">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search orders" placeholder="Search order or reference" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-9 pl-9 text-sm shadow-none" />
          </div>
          <CustomSelect compact value={filterType} onChange={setFilterType} options={[
            { value: "All", label: "All Channels" },
            { value: "Walk-in", label: "Walk-in" },
            { value: "Institutional", label: "Institutional" },
          ]} />
          {activeTab === "active" && (
            <OrderStatusFilter<"processing" | "shipped"> value={activeStatus} onChange={setActiveStatus} options={[
              { value: "processing", label: "Processing", count: activeGroups.processing.length },
              { value: "shipped", label: "Shipped", count: activeGroups.shipped.length },
            ]} />
          )}
          {activeTab === "refunds" && (
            <OrderStatusFilter<RefundSubTab> value={refundSubTab} onChange={setRefundSubTab} options={[
              { value: "requested", label: "Refund Requests", count: refundRequests.length },
              { value: "refunded", label: "Refunded", count: refundedOrders.length },
              { value: "rejected", label: "Rejected", count: rejectedRefunds.length },
            ]} />
          )}
          {activeTab === "voids" && (
            <OrderStatusFilter<VoidSubTab> value={voidSubTab} onChange={setVoidSubTab} options={[
              { value: "requested", label: "Void Requests", count: voidRequests.length },
              { value: "voided", label: "Voided", count: voidedOrders.length },
              { value: "rejected", label: "Rejected", count: rejectedVoids.length },
            ]} />
          )}
        </div>
      {isLoading ? (
        <OrderListSkeleton />
      ) : (
        <div className="flex flex-col gap-4 w-full">
          <div ref={resultsRef} className="flex w-full flex-col gap-4">
            {currentOrders.length > 0 && (
              <div className="min-w-0">
                <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {orderListColumns.map(({ label, className }) => (
                        <th key={label} scope="col" className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pageOrders.map((order) => (
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
                        onCompletePayment={() => completePayment(order.id)}
                        onConfirmDelivery={(details: DeliveryConfirmationInput) => confirmDelivery(order.id, details)}
                        isMobile={isMobile}
                        viewMode="list"
                      />
                    ))}
                  </tbody>
                </table>
                </div>
                {paginationFooter}
              </div>
            )}
            {currentOrders.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {activeTab === "refunds" || activeTab === "voids" ? "No orders match this view." : `No ${activeTab} orders found.`}
              </div>
            )}
          </div>
          {currentOrders.length === 0 && paginationFooter}
        </div>
      )}

      </section>

      {/* Dialogs */}
            <VoidFormDialog isOpen={showVoidDialog} onClose={() => setShowVoidDialog(false)} order={selectedOrder} reason={voidReason} setReason={setVoidReason} onSubmit={handleRequestVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RejectVoidDialog isOpen={showRejectVoidDialog} onClose={() => setShowRejectVoidDialog(false)} order={orderToRejectVoid} onSubmit={handleRejectVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <ApproveVoidDialog isOpen={showApproveVoidDialog} onClose={() => setShowApproveVoidDialog(false)} order={orderToApproveVoid} onSubmit={handleApproveVoidSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RefundFormDialog isOpen={showRefundDialog} onClose={() => setShowRefundDialog(false)} order={selectedOrder} reason={refundReason} setReason={setRefundReason} onSubmit={handleRequestRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
      <RejectRefundDialog isOpen={showRejectDialog} onClose={() => setShowRejectDialog(false)} order={orderToReject} onSubmit={handleRejectRefundSubmit} primary={LEGACY_COLORS.primary} muted={LEGACY_COLORS.muted} border={LEGACY_COLORS.border} text={LEGACY_COLORS.text} cardBg={LEGACY_COLORS.cardBg} inputBg={LEGACY_COLORS.inputBg} isMobile={isMobile} />
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
              <ModalCloseButton onClick={() => setShowManagerPinDialog(false)} />
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
                  <div className="h-9 flex items-center justify-center" aria-label="Loading PIN">
                    <Bone className="h-7 w-36 rounded-lg" />
                  </div>
                ) : managerPinError ? (
                  <p className="text-sm text-red-600" role="alert">{managerPinError}</p>
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
