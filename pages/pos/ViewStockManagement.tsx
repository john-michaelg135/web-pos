"use client";

import { useState, useEffect } from "react";
import { StockLevelGrid } from "@/components/module-pos/StockLevelGrid";
import { GridIcon, TableIcon } from "@/icons";
import { StockLevel, StockMovement } from "@/components/module-pos/types";
import StockAdjustmentFormDialog from "@/components/module-pos/StockAdjustmentFormDialog";
import { StockReceivingForm } from "@/components/module-pos/StockReceivingForm";
import { StockMovementTable } from "@/components/module-pos/StockMovementTable";
import { apiClient } from "@/components/module-pos/api";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";

export function ViewStockManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"levels" | "receive" | "history" | "approvals">("levels");

  // Stock Levels State
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Adjustment Form State
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Stock Receiving State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingArrivalData, setPendingArrivalData] = useState<{
    variationId: string;
    productName: string;
    variationName: string;
    locationId?: number;
    quantity: number;
    reference: string;
    notes: string;
  } | null>(null);

  // Stock Adjustments State
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
      setRefreshKey(prev => prev + 1); // refresh stock grid
    } catch (err) {
      console.error("Failed to approve adjustment:", err);
      toast.error("Failed to approve adjustment.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (activeTab === "approvals") {
      fetchAdjustments();
    } else if (activeTab === "history") {
      fetchMovements();
    }
  }, [activeTab]);

  // Handlers for Stock Levels
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

    if (adjustmentReason.trim().length > 500) {
      toast.error("Reason must not exceed 500 characters.");
      return;
    }

    if (/[<>]/.test(adjustmentReason)) {
      toast.error("Reason cannot contain HTML characters (<, >).");
      return;
    }

    try {
      await apiClient.apiPos.inventoryAdjustmentsCreate({
        variationId: Number(selectedStock.variationId),
        locationId: Number(selectedStock.locationId),
        quantity: qty,
        adjustmentType: "Correction",
        reason: adjustmentReason.trim(),
        submittedBy: 1
      });
      toast.success("Stock adjustment submitted for approval.");
      setShowAdjustmentDialog(false);
      fetchAdjustments();
    } catch (err) {
      console.error("Failed to submit adjustment:", err);
      toast.error("Failed to submit adjustment.");
    }
  };

  // Handlers for Stock Receiving
  const handleRecordArrival = async (data: {
    variationId: string;
    productName: string;
    variationName: string;
    locationId?: number;
    quantity: number;
    reference: string;
    notes: string;
  }) => {
    setPendingArrivalData(data);
    setShowConfirmDialog(true);
  };

  const confirmRecordArrival = async () => {
    if (!pendingArrivalData) return;
    try {
      const locationId = pendingArrivalData.locationId || 1;
      
      await apiClient.apiPos.inventoryStockReceivingCreate({
        variationId: Number(pendingArrivalData.variationId),
        locationId,
        quantityReceived: pendingArrivalData.quantity,
        notes: pendingArrivalData.notes
      });
      
      toast.success("Stock received successfully!");
      fetchMovements();
      setRefreshKey(prev => prev + 1); // refresh stock grid
    } catch (err) {
      console.error("Error posting arrival:", err);
      toast.error("Failed to record stock arrival.");
    } finally {
      setShowConfirmDialog(false);
      setPendingArrivalData(null);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!authUser || (authUser.username !== "posuser" && !authUser.apps.includes("stock-management"))) {
    return <AccessDenied />;
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Stock Management</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monitor stock levels, manage adjustments, and record new arrivals.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab("levels")}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === "levels" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              Stock Levels
            </button>
            <button 
              onClick={() => setActiveTab("receive")}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === "receive" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              Receive Stock
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === "history" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              Stock History Log
            </button>
            <button 
              onClick={() => setActiveTab("approvals")}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === "approvals" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              Approvals Queue
              <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full">New</span>
            </button>
          </div>
        </div>

        {/* Tab Content: Stock Levels */}
        {activeTab === "levels" && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6">
            {/* Filter Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by product name, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={25}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-outfit"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Location Select Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Location:</span>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-outfit"
                  >
                    <option value="All">All Locations</option>
                    <option value="Store">Store</option>
                    <option value="Bazaar">Bazaar</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-xl p-1 bg-gray-50 dark:bg-gray-950">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-900 text-brand-500 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                    title="Grid View"
                  >
                    <GridIcon className="w-5 h-5 block" viewBox="0 0 24 24" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white dark:bg-gray-900 text-brand-500 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                    title="Table View"
                  >
                    <TableIcon className="w-5 h-5 block" viewBox="0 0 24 24" />
                  </button>
                </div>
              </div>
            </div>

            <StockLevelGrid 
              key={refreshKey}
              selectedLocation={selectedLocation} 
              searchQuery={searchQuery} 
              viewMode={viewMode} 
              onAdjustStock={handleAdjustStock}
            />
          </div>
        )}

        {/* Tab Content: Receive Stock */}
        {activeTab === "receive" && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6">
            <StockReceivingForm onSuccess={handleRecordArrival} />
          </div>
        )}

        {/* Tab Content: Stock History Log */}
        {activeTab === "history" && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6">
            <StockMovementTable movements={movements} />
          </div>
        )}

        {/* Tab Content: Approvals Queue */}
        {activeTab === "approvals" && (
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {isAdjustmentsLoading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : adjustments.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Stock Adjustments</h3>
                <p className="text-sm max-w-md mx-auto">
                  There are no stock adjustment requests found in the system.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adjustment ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product / SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Qty</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {adjustments.map((adj) => {
                        const isPending = adj.status === "PendingApproval";
                        const quantity = Number(adj.quantity) || 0;
                        const formattedQty = quantity > 0 ? `+${quantity}` : `${quantity}`;

                        return (
                          <tr key={adj.adjustmentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                              #{adj.adjustmentId}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{adj.productName || "Unknown Product"}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{adj.variationName || "Unknown SKU"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                {adj.locationName || `Location ${adj.locationId}`}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-black text-sm ${quantity > 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                              {formattedQty}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate" title={adj.reason}>
                              {adj.reason}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                  isPending
                                    ? "bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-100 dark:border-warning-900/50"
                                    : "bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 border-success-100 dark:border-success-900/50"
                                }`}>
                                  {isPending ? "PENDING APPROVAL" : "APPROVED"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                {isPending ? (
                                  <button
                                    onClick={() => handleApproveAdjustment(Number(adj.adjustmentId))}
                                    className="px-3 py-1.5 text-white text-xs font-bold rounded-lg bg-brand-500 hover:bg-brand-600 shadow-sm shadow-brand-500/20 transition-all"
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                    Approved
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


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
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingArrivalData(null);
        }}
        onConfirm={confirmRecordArrival}
        title="Confirm Stock Arrival"
        message={`Are you sure you want to record the arrival of ${pendingArrivalData?.quantity} units for "${pendingArrivalData?.productName} (${pendingArrivalData?.variationName})"?`}
        confirmVariant="brand"
      />
    </div>
  );
}

export default ViewStockManagement;
