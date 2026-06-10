"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";
import { ProductResponseDto } from "@/components/module-pos/api/api";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useTheme as useRealTheme } from "@/context/ThemeContext";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

interface StockReceivingFormProps {
  onSuccess: (data: {
    variationId: string;
    productName: string;
    variationName: string;
    quantity: number;
    reference: string;
    notes: string;
  }) => void;
}

export function StockReceivingForm({ onSuccess }: StockReceivingFormProps) {
  const [variationId, setVariationId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { theme } = useTheme();
  const dark = theme === "dark";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const muted = dark ? "#8899aa" : "#667085";

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await apiClient.apiPos.productCatalogProductsList();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products", err);
      }
    };
    loadProducts();
  }, []);

  const allVariations = products.flatMap((p) =>
    (p.variations || [])
      .filter((v) => v.isActive)
      .map((v) => ({
        variationId: v.variationId?.toString() || "",
        variationName: v.variationName || "",
        productName: p.productName || "",
        sku: v.variationName || "",
      }))
  );

  const selectedVar = allVariations.find((v) => v.variationId === variationId);

  const filteredVariations = allVariations.filter(
    (v) =>
      v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.variationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variationId || quantity <= 0 || !reference) return;

    const selectedVar = allVariations.find((v) => v.variationId === variationId);

    onSuccess({
      variationId,
      productName: selectedVar?.productName || "Unknown Product",
      variationName: selectedVar?.variationName || "Unknown Variation",
      quantity,
      reference,
      notes
    });
    setVariationId("");
    setQuantity(0);
    setReference("");
    setNotes("");
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Record New Arrival</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Variation Selection Field (Modal Trigger) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Variation</label>
            <div
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer flex justify-between items-center h-[46px] select-none shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className={selectedVar ? "text-gray-900 dark:text-white font-semibold flex items-center gap-2 truncate pr-2" : "text-gray-400 truncate pr-2"}>
                {selectedVar ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                    <span className="font-bold text-gray-900 dark:text-white truncate">{selectedVar.productName}</span>
                    {renderVariationBadges(selectedVar.variationName, muted, border, inputBg, true)}
                  </div>
                ) : (
                  <span>Select Variation...</span>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* Hidden field for HTML5 required constraint validation */}
            <input type="hidden" value={variationId} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</label>
            <input
              type="number"
              value={quantity || ""}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (val > 100000) val = 100000;
                setQuantity(val);
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="0"
              required
              min="1"
              max="100000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reference (PO # / Invoice)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PO-2026-001"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter additional details or receiving instructions..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="w-full md:w-auto min-w-[200px] h-[46px] px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Record Arrival
          </button>
        </div>
      </form>

      {/* Select Variation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Select Variation
              </h2>
            </div>

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-hidden flex-1 flex flex-col gap-4">
              
              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search by product, variation, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={25}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />

              {/* Variations List */}
              <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {filteredVariations.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No variations found.
                  </p>
                ) : (
                  filteredVariations.map((v) => (
                    <div
                      key={v.variationId}
                      onClick={() => {
                        setVariationId(v.variationId);
                        setIsModalOpen(false);
                        setSearchTerm("");
                      }}
                      className="group flex flex-col sm:flex-row justify-between sm:items-center p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/10 cursor-pointer transition-all"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                          {v.productName}
                        </p>
                        <div className="mt-1">
                          {renderVariationBadges(v.variationName, muted, border, inputBg, true)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchTerm("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
