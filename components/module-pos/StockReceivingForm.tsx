"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";
import { ProductResponseDto } from "@/components/module-pos/api/api";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useTheme as useRealTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

interface PendingTransfer {
  transferId: number;
  productId: number;
  sku: string;
  productName: string;
  variationName: string;
  destLocationId: number;
  transferQuantity: number;
  status: string;
  notes: string;
}

interface StockReceivingFormProps {
  onSuccess: (data: {
    variationId: string;
    productName: string;
    variationName: string;
    locationId: number;
    quantity: number;
    reference: string;
    notes: string;
    transferId: number;
  }) => void;
}

export function StockReceivingForm({ onSuccess }: StockReceivingFormProps) {
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Manual Receive Stock Dialog state
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualVariationId, setManualVariationId] = useState("");
  const [manualLocationId, setManualLocationId] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const { theme } = useTheme();
  const dark = theme === "dark";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const muted = dark ? "#8899aa" : "#667085";

  const apiGatewayUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/";
  const scmTransfersUrl = `${apiGatewayUrl.replace(/\/$/, "")}/api/scms/StockTransfers`;

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fetch POS catalog to match SKUs to variation IDs
      const { data: prodData } = await apiClient.apiPos.productCatalogProductsList();
      setProducts(prodData);

      // Fetch POS locations
      const { data: locData } = await apiClient.apiPos.locationsList();
      setLocations(locData);

      // Fetch SCM pending transfers
      const scmResponse = await apiClient.instance.get("/api/scms/api/StockTransfers", {
        baseURL: apiGatewayUrl
      });
      const payload = scmResponse.data;
      if (payload.success && payload.data) {
        setTransfers(payload.data);
      } else {
        setTransfers([]);
      }
    } catch (err: any) {
      console.error("Error loading pending transfers:", err);
      toast.error(err.message || "Failed to retrieve pending deliveries from SCM.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map products and variations to array of SKUs
  const allVariations = products.flatMap((p) =>
    (p.variations || [])
      .filter((v) => v.isActive)
      .map((v) => ({
        variationId: v.variationId?.toString() || "",
        variationName: v.variationName || "",
        productName: p.productName || "",
        sku: (v.variationName || "").split("|")[0] || "",
      }))
  );

  // Non-commissary locations for the manual form
  const receivableLocations = locations.filter((l) => l.locationId !== 999 && l.isActive !== false);

  const filteredTransfers = transfers.filter((t) =>
    t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = (transfer: PendingTransfer) => {
    const matchedVar = allVariations.find(
      (v) => v.sku.toLowerCase() === transfer.sku.toLowerCase()
    );

    if (!matchedVar) {
      toast.error("This product variation is not synced in POS catalog.");
      return;
    }

    onSuccess({
      variationId: matchedVar.variationId,
      productName: matchedVar.productName,
      variationName: matchedVar.variationName,
      locationId: transfer.destLocationId,
      quantity: transfer.transferQuantity,
      reference: `SCM-TR-${transfer.transferId}`,
      notes: transfer.notes || `SCM Stock Transfer ID: ${transfer.transferId}`,
      transferId: transfer.transferId,
    });
  };

  const handleManualSubmit = () => {
    if (!manualVariationId || !manualLocationId || !manualQuantity) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const qty = Number(manualQuantity);
    if (isNaN(qty) || qty <= 0 || qty > 100000) {
      toast.error("Quantity must be between 1 and 100,000.");
      return;
    }
    if (manualNotes && /[<>]/.test(manualNotes)) {
      toast.error("Notes cannot contain HTML characters (<, >).");
      return;
    }

    const matchedVar = allVariations.find((v) => v.variationId === manualVariationId);
    if (!matchedVar) {
      toast.error("Selected variation not found.");
      return;
    }

    onSuccess({
      variationId: matchedVar.variationId,
      productName: matchedVar.productName,
      variationName: matchedVar.variationName,
      locationId: Number(manualLocationId),
      quantity: qty,
      reference: "Manual Entry",
      notes: manualNotes.trim() || "Manual stock receiving",
      transferId: 0,
    });

    // Reset form and close dialog
    setShowManualDialog(false);
    setManualVariationId("");
    setManualLocationId("");
    setManualQuantity("");
    setManualNotes("");
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Deliveries</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Confirm stock arrivals sent from the commissary.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualDialog(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
          >
            <svg
              style={{ width: 16, height: 16, marginRight: 8, display: "inline-block", verticalAlign: "middle" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Receive Stock
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <div style={{ width: 16, height: 16, marginRight: 8 }} className="border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                style={{ width: 16, height: 16, marginRight: 8, display: "inline-block", verticalAlign: "middle" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Manual Receive Stock Dialog */}
      {showManualDialog && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Receive Stock</h2>
              <button
                onClick={() => setShowManualDialog(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dialog Body */}
            <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
              {/* Product Variation Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product Variation <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={manualVariationId}
                  onChange={(val) => setManualVariationId(val)}
                  className="w-full text-sm"
                  options={[
                    { value: "", label: "Select a product variation..." },
                    ...allVariations.map((v) => ({
                      value: v.variationId,
                      label: `${v.productName} — ${v.variationName}`
                    }))
                  ]}
                />
              </div>

              {/* Location Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={manualLocationId}
                  onChange={(val) => setManualLocationId(val)}
                  className="w-full text-sm"
                  options={[
                    { value: "", label: "Select a location..." },
                    ...receivableLocations.map((loc) => ({
                      value: String(loc.locationId),
                      label: loc.locationName
                    }))
                  ]}
                />
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                  placeholder="Enter quantity received"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-outfit"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Optional notes..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-outfit resize-none"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <button
                onClick={() => setShowManualDialog(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualVariationId || !manualLocationId || !manualQuantity}
                className="px-5 py-2 text-sm font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-brand-500/20"
              >
                Receive Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and search */}
      <div className="relative w-full max-w-md">
        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search SCM deliveries by product or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={25}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-outfit"
        />
      </div>

      {/* Table of SCM deliveries */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product Details
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Quantity
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Fetching pending deliveries from SCM...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No pending deliveries found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const matchedVar = allVariations.find(
                    (v) => v.sku.toLowerCase() === t.sku.toLowerCase()
                  );
                  const destLoc = locations.find((l) => l.locationId === t.destLocationId);
                  const locationName = destLoc ? destLoc.locationName : `Location #${t.destLocationId}`;

                  return (
                    <tr
                      key={t.transferId}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {t.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <code className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {t.sku}
                          </code>
                          {matchedVar ? (
                            renderVariationBadges(matchedVar.variationName, muted, border, inputBg, true)
                          ) : (
                            <span className="text-[10px] font-semibold text-error-500 bg-error-50 dark:bg-error-500/10 px-2 py-0.5 rounded border border-error-200 dark:border-error-900/30">
                              Not Synced in POS
                            </span>
                          )}
                        </div>
                        {t.notes && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                            Note: {t.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-gray-900 dark:text-white">
                        {t.transferQuantity} units
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          {locationName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                        TR-{t.transferId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleConfirm(t)}
                            disabled={!matchedVar}
                            className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-brand-500/20 transition-all"
                          >
                            Confirm Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
