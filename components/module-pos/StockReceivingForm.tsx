"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/components/module-pos/api";
import { ProductResponseDto } from "@/components/module-pos/api/api";
import { toast } from "sonner";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { useMyLocations } from "@/lib/useMyLocations";

import { Bone, SkeletonRows } from "@/components/shared/PageSkeleton";
import { TransferReceiveDialog, type PendingTransfer } from "@/components/module-pos/TransferReceiveDialog";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

const unitsIn = (t: PendingTransfer) => t.lines.reduce((sum, l) => sum + l.expectedQuantity, 0);

interface StockReceivingFormProps {
  /** An SCMS delivery was received into stock. */
  onReceived: () => void;
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

export function StockReceivingForm({ onSuccess, onReceived }: StockReceivingFormProps) {
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [receiving, setReceiving] = useState<PendingTransfer | null>(null);
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

  const { scope: locScope, locations: myLocations } = useMyLocations();

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fetch POS catalog to match SKUs to variation IDs
      const { data: prodData } = await apiClient.apiPos.productCatalogProductsList();
      setProducts(prodData);

      // Fetch POS locations
      const { data: locData } = await apiClient.apiPos.locationsList();
      setLocations(locData);

      // Deliveries SCMS sent to the caller's branches that haven't been received yet
      const { data: pending } = await apiClient.instance.get<PendingTransfer[]>("/api-pos/transfers/pending");
      setTransfers(Array.isArray(pending) ? pending : []);
    } catch (err: any) {
      console.error("Error loading pending deliveries:", err);
      toast.error(err?.response?.data?.message || "Couldn't load pending deliveries.");
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

  // Non-commissary locations for the manual form.
  // Assigned (non-super) users can only receive into their own branch(es);
  // super users see every receivable location.
  const assignedIds = new Set(myLocations.map((l) => l.locationId));
  const receivableLocations = locations.filter((l) => {
    if (l.locationId === 999 || l.isActive === false) return false;
    if (locScope === "assigned") return assignedIds.has(l.locationId);
    return true;
  });

  const filteredTransfers = transfers.filter((t) => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return true;
    return (
      t.transferId.toLowerCase().includes(q) ||
      (t.destinationLocationName || "").toLowerCase().includes(q) ||
      t.lines.some((l) => l.productName.toLowerCase().includes(q) || (l.sku || "").toLowerCase().includes(q))
    );
  });

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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Deliveries</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Confirm stock arrivals sent from the commissary.
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto] sm:flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowManualDialog(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
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
              <div style={{ width: 16, height: 16, marginRight: 8 }} className="border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
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
      {showManualDialog && createPortal(
        <>
          <div
            onClick={() => setShowManualDialog(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 99999,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              backgroundColor: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Dialog Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>Add Receive Stock</h2>
                <button
                  onClick={() => setShowManualDialog(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring focus:border-foreground transition-all font-outfit"
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
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring focus:border-foreground transition-all font-outfit resize-none"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #e4e4e7", display: "flex", justifyContent: "flex-end", gap: 8, backgroundColor: "#fafafa", borderRadius: "0 0 12px 12px", flexShrink: 0 }}>
              <button
                onClick={() => setShowManualDialog(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground bg-background hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualVariationId || !manualLocationId || !manualQuantity}
                className="px-5 py-2 text-sm font-bold rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Receive Stock
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Filter and search */}
      <div className="w-full">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by reference, branch, product or SKU…"
          maxLength={25}
          className="w-full sm:max-w-[320px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Phones: one card per delivery */}
      <ul className="md:hidden flex flex-col gap-2.5 m-0 p-0 list-none">
        {isLoading ? (
          <li className="space-y-2.5" aria-label="Loading pending deliveries">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-24 rounded-xl" />
            ))}
          </li>
        ) : filteredTransfers.length === 0 ? (
          <li className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No pending deliveries.</li>
        ) : (
          filteredTransfers.map((t) => {
            const unmatched = t.lines.filter((l) => l.variationId == null).length;
            return (
              <li key={t.transferId} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white m-0 font-mono">{t.transferId}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1">
                      To {t.destinationLocationName} · {formatDate(t.transferDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black leading-none text-gray-900 dark:text-white tabular-nums m-0">{unitsIn(t)}</p>
                    <p className="text-[10px] text-gray-500 m-0 mt-1">units</p>
                  </div>
                </div>
                <ul className="m-0 p-0 list-none space-y-1">
                  {t.lines.map((l) => (
                    <li key={l.lineId} className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <span className="min-w-0 truncate">{l.posProductName ?? l.productName}</span>
                      <span className="tabular-nums shrink-0">{l.expectedQuantity}</span>
                    </li>
                  ))}
                </ul>
                {unmatched > 0 && <UnmatchedBadge count={unmatched} />}
                <button
                  onClick={() => setReceiving(t)}
                  className="w-full h-10 text-xs font-bold text-white rounded-lg bg-primary hover:bg-primary/90 shadow-sm transition-all"
                >
                  Receive
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Table of pending deliveries */}
      <div className="hidden md:block border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider !text-right">Units</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider !text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                // Same columns as a delivery row: reference, items, units, destination, status, action.
                <SkeletonRows columns={["stack", "stack", "num", "text", "badge", "button"]} rows={5} cellClassName="px-6 py-4" />
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No pending deliveries.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const unmatched = t.lines.filter((l) => l.variationId == null).length;
                  return (
                    <tr key={t.transferId} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors align-top">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">{t.transferId}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(t.transferDate)}
                          {t.sourceLocationName ? ` · from ${t.sourceLocationName}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ul className="m-0 p-0 list-none space-y-1">
                          {t.lines.map((l) => (
                            <li key={l.lineId} className="text-sm text-gray-700 dark:text-gray-200">
                              {l.posProductName ?? l.productName}
                              {l.sku && (
                                <code className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  {l.sku}
                                </code>
                              )}
                              <span className="ml-2 text-xs text-gray-500 tabular-nums">× {l.expectedQuantity}</span>
                            </li>
                          ))}
                        </ul>
                        {unmatched > 0 && (
                          <div className="mt-2">
                            <UnmatchedBadge count={unmatched} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-gray-900 dark:text-white tabular-nums">{unitsIn(t)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {t.destinationLocationName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 whitespace-nowrap">
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => setReceiving(t)}
                            className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-primary hover:bg-primary/90 shadow-sm transition-all"
                          >
                            Receive
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

      <TransferReceiveDialog
        transfer={receiving}
        onClose={() => setReceiving(null)}
        onReceived={() => {
          loadData();
          onReceived();
        }}
      />
    </div>
  );
}

function UnmatchedBadge({ count }: { count: number }) {
  return (
    <span className="inline-block text-[10px] font-semibold text-error-500 bg-error-50 dark:bg-error-500/10 px-2 py-0.5 rounded border border-error-200 dark:border-error-900/30">
      {count === 1 ? "1 item not in POS catalog" : `${count} items not in POS catalog`}
    </span>
  );
}
