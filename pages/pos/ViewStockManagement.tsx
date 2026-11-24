"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { toast } from "@/lib/toast";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { useMyLocations } from "@/lib/useMyLocations";
import { apiClient } from "@/components/module-pos/api";
import { StockLevelGrid } from "@/components/module-pos/StockLevelGrid";
import { StockReceivingForm } from "@/components/module-pos/StockReceivingForm";
import { StockMovementTable } from "@/components/module-pos/StockMovementTable";
import { StockInventoryMovement } from "@/components/module-pos/StockInventoryTable";
import StockAdjustmentFormDialog, { MAX_STOCK_REQUEST_QUANTITY, type StockLossInput } from "@/components/module-pos/StockAdjustmentFormDialog";
import {
  newClientRequestId,
  stockRequestItemLabel,
  stockRequestKey,
  type StockRequestRecord,
} from "@/components/module-pos/StockRequestHistory";
import { StockRequestsPanel } from "@/components/module-pos/StockRequestsPanel";
import { StockRequestDetailPanel } from "@/components/module-pos/StockRequestDetailPanel";
import { CancelStockRequestDialog } from "@/components/module-pos/CancelStockRequestDialog";
import { StockLossTable, type StockLossRecord } from "@/components/module-pos/StockLossTable";
import { isManager as isManagerRole } from "@/lib/portal/roles";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { SearchInput } from "@/components/module-pos/SearchInput";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import { StockLevel, StockMovement } from "@/components/module-pos/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { compactSubtabClass, subtabClass, subtabListClass } from "@/components/ui/subtab-styles";

import { StockManagementSkeleton } from "@/components/shared/PageSkeleton";

type StockTab = "levels" | "receive" | "requests" | "history" | "losses";
const STOCK_TABS: readonly StockTab[] = ["levels", "receive", "requests", "history", "losses"];
const isStockTab = (value: string | null): value is StockTab => !!value && (STOCK_TABS as readonly string[]).includes(value);

export function ViewStockManagement() {
  const { user: authUser, isLoading: authLoading, canRead } = useAuth();
  const { scope, locations: myLocations } = useMyLocations();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<StockTab>("levels");

  // Notification links: ?tab=receive&transferId=… or ?tab=levels&locationId=…&variationId=…
  const searchParams = useSearchParams();
  const linkTab = searchParams?.get("tab") ?? null;
  const linkTransferId = searchParams?.get("transferId") ?? "";
  const linkLocationId = Number(searchParams?.get("locationId")) || null;
  const linkVariationId = Number(searchParams?.get("variationId")) || null;
  const focusVariationId = linkTab === "levels" ? linkVariationId : null;
  // Applied while rendering when the link changes (not in an effect), so a new link opens its tab.
  const linkKey = searchParams?.toString() ?? "";
  const [appliedLink, setAppliedLink] = useState<string | null>(null);
  if (linkKey !== appliedLink) {
    setAppliedLink(linkKey);
    if (isStockTab(linkTab)) setActiveTab(linkTab);
  }

  // Only admins/owners (super users, "all" scope) may see or switch between
  // locations. Assigned staff are pinned to their own branch.
  const canSwitchLocation = scope === "all";
  const assignedLocation = myLocations.find((l) => l.isPrimary) ?? myLocations[0] ?? null;

  const [selectedLocation, setSelectedLocation] = useState("All");
  const [locations, setLocations] = useState<any[]>([]);
  const [inactiveLocationIds, setInactiveLocationIds] = useState<number[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [stockRequests, setStockRequests] = useState<StockRequestRecord[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  // One key per request form: a double submit returns the same request instead of making a second.
  const [clientRequestId, setClientRequestId] = useState(() => newClientRequestId());
  // Requests tab, detail panel, cancel confirmation, and the open-request chips on Stock Levels.
  const [branchRequests, setBranchRequests] = useState<StockRequestRecord[]>([]);
  const [isBranchRequestsLoading, setIsBranchRequestsLoading] = useState(false);
  const [requestItemFilter, setRequestItemFilter] = useState<{ variationId: number; label: string } | null>(null);
  const [detailRequest, setDetailRequest] = useState<StockRequestRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StockRequestRecord | null>(null);
  const [openRequestCounts, setOpenRequestCounts] = useState<Record<string, number>>({});

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<StockInventoryMovement[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingArrivalData, setPendingArrivalData] = useState<{
    variationId: string;
    productName: string;
    variationName: string;
    locationId: number;
    quantity: number;
    reference: string;
    notes: string;
    transferId: number;
  } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [losses, setLosses] = useState<StockLossRecord[]>([]);
  const [isLossesLoading, setIsLossesLoading] = useState(false);

  // Managers (and the owner) record stock losses; the API enforces the same rule.
  const canRecordLoss = !!authUser && (authUser.isSuperUser || isManagerRole(authUser.role));

  const fetchLosses = async () => {
    const selectedLocationId = locations.find((location) => location.locationName === selectedLocation)?.locationId;
    if (!canSwitchLocation && !selectedLocationId) return;
    try {
      setIsLossesLoading(true);
      const params = selectedLocation !== "All" && selectedLocationId ? { locationId: String(selectedLocationId) } : {};
      const { data } = await apiClient.instance.get<StockLossRecord[]>("/api-pos/inventory/adjustments/losses", { params });
      setLosses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch stock losses:", err);
      toast.error("Failed to load stock losses.");
    } finally {
      setIsLossesLoading(false);
    }
  };

  const handleRecordLoss = async (loss: StockLossInput) => {
    if (!selectedStock) return false;
    try {
      await apiClient.instance.post("/api-pos/inventory/adjustments/losses", {
        variationId: Number(selectedStock.variationId),
        locationId: Number(selectedStock.locationId),
        quantity: loss.quantity,
        lossReason: loss.lossReason,
        notes: loss.notes || null,
      });
      toast.success(`Recorded a stock loss of ${loss.quantity} unit${loss.quantity === 1 ? "" : "s"}.`);
      setSelectedStock({ ...selectedStock, quantity: selectedStock.quantity - loss.quantity });
      fetchInventoryMovements();
      fetchLosses();
      setRefreshKey((prev) => prev + 1);
      return true;
    } catch (err) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      const message = typeof data === "string" && data
        ? data
        : (data as { message?: string } | undefined)?.message;
      toast.error(message || "Failed to record the loss.");
      return false;
    }
  };

  const fetchMovements = async () => {
    try {
      const { data } = await apiClient.apiPos.inventoryStockReceivingList();
      const mappedMovements: StockMovement[] = data.map((item) => ({
        id: `M-${item.receivingId}`,
        variationId: item.variationId?.toString() || "",
        productName: item.productName || "Unknown Product",
        variationName: item.variationName || "Unknown Variation",
        quantity: item.quantityReceived || 0,
        type: "arrival",
        date: item.receivedAt || new Date().toISOString(),
        reference: item.transferId || "-",
        notes: item.notes || "",
      }));
      setMovements(mappedMovements);
    } catch (err) {
      console.error("Failed to fetch stock receiving movements:", err);
    }
  };

  const fetchInventoryMovements = async () => {
    try {
      setIsInventoryLoading(true);
      const selectedLocationId = locations.find(
        (location) => location.locationName === selectedLocation
      )?.locationId;

      // Assigned users must wait until their branch has been resolved. Sending
      // "All" without a branch causes the API to reject the request with 400.
      if (!canSwitchLocation && !selectedLocationId) {
        return;
      }

      const params = selectedLocation !== "All"
        ? { locationId: String(selectedLocationId) }
        : {};
      const { data } = await apiClient.instance.get("/api-pos/inventory/stock/movements", { params });
      setInventoryMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch stock inventory:", err);
      toast.error("Failed to load stock inventory.");
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const selectedLocationId = () =>
    selectedLocation !== "All" ? locations.find((l) => l.locationName === selectedLocation)?.locationId : undefined;

  // Every request at the selected branch (or all branches for owners), for the Requests tab.
  const fetchBranchRequests = async () => {
    const locationId = selectedLocationId();
    if (!canSwitchLocation && !locationId) return;
    try {
      setIsBranchRequestsLoading(true);
      const { data } = await apiClient.instance.get<StockRequestRecord[]>("/api-pos/stock-requests", {
        params: locationId ? { locationId: String(locationId) } : {},
      });
      setBranchRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch stock requests:", err);
      toast.error("Failed to load stock requests.");
    } finally {
      setIsBranchRequestsLoading(false);
    }
  };

  // Open requests per item, for the chips on Stock Levels.
  const fetchOpenRequestCounts = async () => {
    const locationId = selectedLocationId();
    if (!canSwitchLocation && !locationId) return;
    try {
      const { data } = await apiClient.instance.get<StockRequestRecord[]>("/api-pos/stock-requests", {
        params: { open: "true", ...(locationId ? { locationId: String(locationId) } : {}) },
      });
      const counts: Record<string, number> = {};
      for (const r of Array.isArray(data) ? data : []) {
        const key = stockRequestKey(r.variationId, r.locationId);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setOpenRequestCounts(counts);
    } catch (err) {
      console.error("Failed to fetch open stock requests:", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchMovements();

    const fetchLocations = async () => {
      try {
        const { data: allLocations } = await apiClient.apiPos.locationsList();
        // Switched-off branches drop out of the picker and the stock list.
        const data = allLocations.filter((l) => l.isActive !== false);
        setInactiveLocationIds(allLocations.filter((l) => l.isActive === false).map((l) => Number(l.locationId)));
        if (!canSwitchLocation && assignedLocation) {
          // Assigned staff: lock to their own branch only.
          const matched = data.filter(
            (l) => Number(l.locationId) === Number(assignedLocation.locationId)
          );
          setLocations(matched);
          setSelectedLocation(assignedLocation.locationName || "All");
        } else {
          // Admins/owners: full list with an "All Locations" option.
          setLocations(data);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
    fetchLocations();
  }, [authUser, canSwitchLocation, assignedLocation]);

  useEffect(() => {
    if (activeTab === "history") fetchMovements();
    if (activeTab === "losses") fetchLosses();
    if (activeTab === "requests") fetchBranchRequests();
    if (activeTab === "levels") fetchOpenRequestCounts();
    fetchInventoryMovements();
  }, [activeTab, selectedLocation, locations]);

  // A low-stock link names the branch; owners switch to it once the branches have loaded
  // (assigned staff are already pinned to theirs).
  const [appliedLocationLink, setAppliedLocationLink] = useState<string | null>(null);
  if (canSwitchLocation && linkLocationId && locations.length > 0 && linkKey !== appliedLocationLink) {
    setAppliedLocationLink(linkKey);
    const linked = locations.find((l) => Number(l.locationId) === linkLocationId);
    if (linked) setSelectedLocation(linked.locationName);
  }

  // This item's requests to IMS at this branch (newest first), for the Stock Inventory dialog.
  const fetchStockRequests = async (stock: StockLevel) => {
    try {
      setIsRequestsLoading(true);
      const { data } = await apiClient.instance.get<StockRequestRecord[]>("/api-pos/stock-requests", {
        params: { locationId: String(stock.locationId), variationId: String(stock.variationId) },
      });
      setStockRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch stock requests:", err);
      setStockRequests([]);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  const refreshRequestViews = () => {
    if (selectedStock && showAdjustmentDialog) fetchStockRequests(selectedStock);
    fetchOpenRequestCounts();
    if (activeTab === "requests") fetchBranchRequests();
  };

  const handleAdjustStock = (stock: StockLevel) => {
    setSelectedStock(stock);
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setClientRequestId(newClientRequestId());
    setStockRequests([]);
    setShowAdjustmentDialog(true);
    fetchStockRequests(stock);
  };

  // "View all requests for this item": the Requests tab, narrowed to that item.
  const handleViewItemRequests = (stock: { variationId: number | string; variationName?: string; productName?: string }) => {
    setShowAdjustmentDialog(false);
    setRequestItemFilter({
      variationId: Number(stock.variationId),
      label: stockRequestItemLabel({ productName: stock.productName ?? "", variationName: stock.variationName ?? "" }),
    });
    setActiveTab("requests");
  };

  // Cancel: IMS is asked first; the request is Cancelled only once IMS confirms.
  const handleCancelRequest = async (request: StockRequestRecord, reason: string) => {
    try {
      const { data } = await apiClient.instance.put<StockRequestRecord>(
        `/api-pos/stock-requests/${encodeURIComponent(request.requestId)}/cancel`,
        { reason: reason || null },
      );
      toast.success(`Request ${request.requestId} cancelled. IMS was told.`);
      if (detailRequest?.requestId === request.requestId && data) setDetailRequest(data);
      refreshRequestViews();
      return true;
    } catch (err) {
      const body = (err as { response?: { data?: unknown } })?.response?.data;
      const message = typeof body === "string" && body ? body : (body as { message?: string } | undefined)?.message;
      toast.error(message || "Couldn't cancel the request.");
      // A 409 means IMS or POS moved on; show the current state.
      refreshRequestViews();
      return false;
    }
  };

  const openDelivery = (transferId: string) => {
    setDetailRequest(null);
    router.push(`/stock-management?tab=receive&transferId=${encodeURIComponent(transferId)}`);
  };

  // Request Stock: sent straight to IMS, which approves or rejects it (no approval in POS).
  const handleAdjustmentSubmit = async (): Promise<boolean> => {
    if (!selectedStock || isSubmittingRequest) return false;
    const qty = Number(adjustmentQuantity);
    const notes = adjustmentReason.trim();
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_STOCK_REQUEST_QUANTITY) {
      toast.error(`Quantity must be a whole number from 1 to ${MAX_STOCK_REQUEST_QUANTITY}.`);
      return false;
    }
    if (!notes) { toast.error("Add a note so IMS knows why the stock is needed."); return false; }
    if (notes.length > 500) { toast.error("Notes must not exceed 500 characters."); return false; }
    if (/[<>]/.test(notes)) { toast.error("Notes cannot contain < or >."); return false; }

    setIsSubmittingRequest(true);
    try {
      const { data } = await apiClient.instance.post<StockRequestRecord>("/api-pos/stock-requests", {
        variationId: Number(selectedStock.variationId),
        locationId: Number(selectedStock.locationId),
        quantity: qty,
        notes,
        clientRequestId,
      });
      if (data?.status === "Rejected") {
        toast.error(data.remarks ? `IMS refused the request: ${data.remarks}` : "IMS refused the request.");
      } else if (data?.status === "Sending") {
        toast.success("Saved. IMS couldn't be reached; it will be sent automatically.");
      } else {
        toast.success(data?.requestId ? `Request ${data.requestId} sent to IMS.` : "Request sent to IMS.");
      }
      setAdjustmentQuantity("");
      setAdjustmentReason("");
      setClientRequestId(newClientRequestId());
      refreshRequestViews();
      return true;
    } catch (err) {
      const body = (err as { response?: { data?: unknown } })?.response?.data;
      const message = typeof body === "string" && body
        ? body
        : (body as { message?: string } | undefined)?.message;
      toast.error(message || "Failed to send the stock request.");
      fetchStockRequests(selectedStock);
      return false;
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleRecordArrival = async (data: { variationId: string; productName: string; variationName: string; locationId: number; quantity: number; reference: string; notes: string; transferId: number }) => {
    setPendingArrivalData(data);
    setShowConfirmDialog(true);
  };

  const confirmRecordArrival = async () => {
    if (!pendingArrivalData) return;
    try {
      await apiClient.apiPos.inventoryStockReceivingCreate({
        variationId: Number(pendingArrivalData.variationId),
        locationId: Number(pendingArrivalData.locationId),
        quantityReceived: pendingArrivalData.quantity,
        notes: pendingArrivalData.notes,
        transferId: pendingArrivalData.transferId,
      });
      toast.success("Stock received successfully!");
      fetchMovements();
      fetchInventoryMovements();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error posting arrival:", err);
      toast.error("Failed to record stock arrival.");
    } finally {
      setShowConfirmDialog(false);
      setPendingArrivalData(null);
    }
  };

  // Stock Management is a manager-level module. Read access is granted only to
  // managers/owners in br-auth; cashiers have no Stock Management permission and
  // are therefore denied here automatically.
  const hasAccess = !!authUser && canRead(POS_MODULES.STOCK_MANAGEMENT);

  useEffect(() => {
    if (!authLoading && !hasAccess) router.replace("/no-access");
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <StockManagementSkeleton />;

  if (!hasAccess) return null;

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 animate-page-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Stock Management</h1>
          <div className="flex items-center gap-x-2 gap-y-1.5 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <span className="md:hidden">Stock levels, arrivals and history.</span>
              <span className="hidden md:inline">Monitor stock levels, manage adjustments, and record new arrivals.</span>
            </p>
            <Badge variant="secondary" className="text-primary bg-primary/10 font-bold text-xs whitespace-nowrap">
              {canSwitchLocation
                ? "All Locations"
                : assignedLocation
                  ? `${assignedLocation.locationType} - ${assignedLocation.locationName}`
                  : "All Locations"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StockTab)} className="space-y-6">
        <TabsList className={subtabListClass}>
          {[
            { value: "levels", label: "Stock Levels", short: "Levels" },
            { value: "receive", label: "Receive Stock", short: "Receive" },
            { value: "requests", label: "Stock Requests", short: "Requests" },
            { value: "history", label: "Stock History Log", short: "History" },
            { value: "losses", label: "Stock Losses", short: "Losses" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(subtabClass, compactSubtabClass)}
            >
              <span className="md:hidden">{tab.short}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Stock Levels */}
        <TabsContent value="levels" className="subtab-content space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 md:p-4">
            <SearchInput
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Search product, variation or location…"
              aria-label="Search stock levels"
              maxLength={25}
              className="min-w-0 md:max-w-[320px]"
            />
            <div className="flex flex-wrap items-center gap-4 max-md:w-full">
              <div className="flex items-center gap-2 max-md:w-full">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider max-md:sr-only">Location:</span>
                <CustomSelect
                  value={selectedLocation}
                  onChange={(val) => { if (canSwitchLocation) setSelectedLocation(val); }}
                  disabled={!canSwitchLocation}
                  className="w-full md:w-48"
                  options={[
                    ...(canSwitchLocation ? [{ value: "All", label: "All Locations" }] : []),
                    ...locations.map((loc) => ({ value: loc.locationName, label: loc.locationName })),
                  ]}
                />
              </div>
              <div className="hidden md:flex items-center border border-border rounded-lg p-1 bg-muted/50">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")} title="Grid View">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")} title="Table View">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {focusVariationId != null && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="text-foreground">Showing the item from your notification.</span>
              <Button variant="outline" size="sm" onClick={() => router.replace("/stock-management?tab=levels")}>
                Show all items
              </Button>
            </div>
          )}
          <StockLevelGrid key={refreshKey} searchQuery={stockSearch} selectedLocation={selectedLocation} viewMode={viewMode} onAdjustStock={handleAdjustStock} canSwitchLocation={canSwitchLocation} hiddenLocationIds={inactiveLocationIds} focusVariationId={focusVariationId} openRequestCounts={openRequestCounts} onViewRequests={handleViewItemRequests} />
        </TabsContent>

        {/* Receive Stock */}
        <TabsContent value="receive" className="subtab-content space-y-4">
          <StockReceivingForm
            initialSearch={linkTab === "receive" ? linkTransferId : undefined}
            onSuccess={handleRecordArrival}
            onReceived={() => {
              fetchMovements();
              fetchInventoryMovements();
              setRefreshKey((prev) => prev + 1);
            }}
          />
        </TabsContent>

        {/* Stock Requests */}
        <TabsContent value="requests" className="subtab-content space-y-4">
          <StockRequestsPanel
            requests={branchRequests}
            isLoading={isBranchRequestsLoading}
            onRefresh={fetchBranchRequests}
            onSelect={setDetailRequest}
            showBranch={selectedLocation === "All"}
            itemFilter={requestItemFilter}
            onClearItemFilter={() => setRequestItemFilter(null)}
          />
        </TabsContent>

        {/* Stock History Log */}
        <TabsContent value="history" className="subtab-content space-y-4">
          <StockMovementTable movements={movements} />
        </TabsContent>

        {/* Stock Losses */}
        <TabsContent value="losses" className="subtab-content space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Stock Losses</h2>
            <p className="text-sm text-muted-foreground">
              Stock written off as unsellable: expired, damaged or mishandled items.
              {canRecordLoss ? " To record one, open an item in Stock Levels and choose Record loss." : ""}
            </p>
          </div>
          <StockLossTable
            losses={losses}
            isLoading={isLossesLoading}
            onRefresh={fetchLosses}
            showBranch={selectedLocation === "All"}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StockAdjustmentFormDialog
        isOpen={showAdjustmentDialog}
        onClose={() => setShowAdjustmentDialog(false)}
        stock={selectedStock}
        quantity={adjustmentQuantity}
        setQuantity={setAdjustmentQuantity}
        reason={adjustmentReason}
        setReason={setAdjustmentReason}
        onSubmit={handleAdjustmentSubmit}
        primary="#5b2a86"
        muted="#667085"
        border="#e4e7ec"
        text="#101828"
        cardBg="#ffffff"
        inputBg="#ffffff"
        isMobile={isMobile}
        movements={inventoryMovements.filter((movement) =>
          movement.variationId === Number(selectedStock?.variationId) &&
          movement.locationId === Number(selectedStock?.locationId)
        )}
        isMovementsLoading={isInventoryLoading}
        onRecordLoss={canRecordLoss ? handleRecordLoss : undefined}
        requests={stockRequests}
        isRequestsLoading={isRequestsLoading}
        isSubmittingRequest={isSubmittingRequest}
        onCancelRequest={setCancelTarget}
        onViewAllRequests={selectedStock ? () => handleViewItemRequests(selectedStock) : undefined}
      />

      <StockRequestDetailPanel
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        onCancel={setCancelTarget}
        onOpenDelivery={openDelivery}
      />

      <CancelStockRequestDialog
        request={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelRequest}
      />

      <DeleteConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => { setShowConfirmDialog(false); setPendingArrivalData(null); }}
        onConfirm={confirmRecordArrival}
        title="Confirm Stock Arrival"
        message={`Are you sure you want to record the arrival of ${pendingArrivalData?.quantity} units for "${pendingArrivalData?.productName} (${pendingArrivalData?.variationName})"?`}
        confirmVariant="brand"
      />
    </div>
  );
}

export default ViewStockManagement;
