"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/components/module-pos/api";
import { StockLevelGrid } from "@/components/module-pos/StockLevelGrid";
import { StockReceivingForm } from "@/components/module-pos/StockReceivingForm";
import { StockMovementTable } from "@/components/module-pos/StockMovementTable";
import StockAdjustmentFormDialog from "@/components/module-pos/StockAdjustmentFormDialog";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { StockLevel, StockMovement } from "@/components/module-pos/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ViewStockManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"levels" | "receive" | "history">("levels");

  const [locationName, setLocationName] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [locations, setLocations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const [movements, setMovements] = useState<StockMovement[]>([]);
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

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [isAdjustmentsLoading, setIsAdjustmentsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAdjustments = async () => {
    try {
      setIsAdjustmentsLoading(true);
      const { data } = await apiClient.apiPos.inventoryAdjustmentsList();
      setAdjustments(data);
    } catch (err) {
      console.error("Failed to fetch adjustments:", err);
    } finally {
      setIsAdjustmentsLoading(false);
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
        reference: "-",
        notes: item.notes || "",
      }));
      setMovements(mappedMovements);
    } catch (err) {
      console.error("Failed to fetch stock receiving movements:", err);
    }
  };

  const handleApproveAdjustment = async (id: number) => {
    try {
      await apiClient.apiPos.inventoryAdjustmentsApproveUpdate2(id, { approvedBy: 1 });
      toast.success("Adjustment approved successfully!");
      fetchAdjustments();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to approve adjustment:", err);
      toast.error("Failed to approve adjustment.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchAdjustments();
    fetchMovements();

    if (authUser?.locationId) {
      const fetchLocation = async () => {
        try {
          const { data } = await apiClient.apiPos.locationsList();
          const matched = data.find((l) => Number(l.locationId) === Number(authUser.locationId));
          if (matched) setLocationName(matched.locationName || null);
        } catch (err) {
          console.error("Failed to fetch location name:", err);
        }
      };
      fetchLocation();
    }

    const fetchLocations = async () => {
      try {
        const { data } = await apiClient.apiPos.locationsList();
        if (authUser?.subRole === "Cashier") {
          const matched = data.filter((l) => Number(l.locationId) === Number(authUser.locationId) && l.locationId !== 999);
          setLocations(matched);
          if (matched.length > 0) setSelectedLocation(matched[0].locationName || "All");
        } else {
          setLocations(data);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
    fetchLocations();
  }, [authUser]);

  useEffect(() => {
    if (activeTab === "history") fetchMovements();
  }, [activeTab]);

  const handleAdjustStock = (stock: StockLevel) => {
    setSelectedStock(stock);
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setShowAdjustmentDialog(true);
  };

  const handleAdjustmentSubmit = async () => {
    if (!selectedStock || !adjustmentQuantity || !adjustmentReason.trim()) return;
    const qty = Number(adjustmentQuantity);
    if (isNaN(qty) || qty === 0 || qty < -10000 || qty > 10000) {
      toast.error("Quantity must be between -10000 and 10000 (excluding 0).");
      return;
    }
    if (adjustmentReason.trim().length > 500) { toast.error("Reason must not exceed 500 characters."); return; }
    if (/[<>]/.test(adjustmentReason)) { toast.error("Reason cannot contain HTML characters (<, >)."); return; }

    try {
      await apiClient.apiPos.inventoryAdjustmentsCreate({
        variationId: Number(selectedStock.variationId),
        locationId: Number(selectedStock.locationId),
        quantity: qty,
        adjustmentType: "Correction",
        reason: adjustmentReason.trim(),
        submittedBy: 1,
      });
      toast.success("Stock adjustment submitted for approval.");
      setShowAdjustmentDialog(false);
      fetchAdjustments();
    } catch (err) {
      console.error("Failed to submit adjustment:", err);
      toast.error("Failed to submit adjustment.");
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
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error posting arrival:", err);
      toast.error("Failed to record stock arrival.");
    } finally {
      setShowConfirmDialog(false);
      setPendingArrivalData(null);
    }
  };

  const hasAccess = authUser && (authUser.username === "posuser" || authUser.apps.includes("stock-management"));
  const isCashier = authUser?.subRole === "Cashier";

  useEffect(() => {
    if (!authLoading && (!hasAccess || isCashier)) router.replace("/access-denied");
  }, [authUser, authLoading, hasAccess, isCashier, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess || isCashier) return null;

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 max-w-7xl mx-auto animate-page-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Stock Management</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Monitor stock levels, manage adjustments, and record new arrivals.</p>
            <Badge variant="secondary" className="text-xs font-semibold">
              {locationName ? `Store - ${locationName}` : "All Locations"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "levels" | "receive" | "history")} className="space-y-6">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-2 p-0">
          {[
            { value: "levels", label: "Stock Levels" },
            { value: "receive", label: "Receive Stock" },
            { value: "history", label: "Stock History Log" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-t-lg rounded-b-none px-4 py-2.5 text-sm font-semibold border transition-colors data-[state=active]:shadow-none",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary",
                "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-border"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Stock Levels */}
        <TabsContent value="levels" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location:</span>
                <CustomSelect
                  value={selectedLocation}
                  onChange={(val) => setSelectedLocation(val)}
                  disabled={authUser?.subRole === "Cashier"}
                  className="w-48"
                  options={[
                    ...(authUser?.subRole !== "Cashier" ? [{ value: "All", label: "All Locations" }] : []),
                    ...locations.map((loc) => ({ value: loc.locationName, label: loc.locationName })),
                  ]}
                />
              </div>
              <div className="flex items-center border border-border rounded-lg p-1 bg-muted/50">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")} title="Grid View">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")} title="Table View">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <StockLevelGrid key={refreshKey} selectedLocation={selectedLocation} viewMode={viewMode} onAdjustStock={handleAdjustStock} />
        </TabsContent>

        {/* Receive Stock */}
        <TabsContent value="receive" className="space-y-4">
          <StockReceivingForm onSuccess={handleRecordArrival} />
        </TabsContent>

        {/* Stock History Log */}
        <TabsContent value="history" className="space-y-4">
          <StockMovementTable movements={movements} />
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
        primary="#465fff"
        muted="#667085"
        border="#e4e7ec"
        text="#101828"
        cardBg="#ffffff"
        inputBg="#ffffff"
        isMobile={false}
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
