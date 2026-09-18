"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";
import { StockResponseDto } from "@/components/module-pos/api/api";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useTheme as useRealTheme } from "@/context/ThemeContext";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

interface StockLevelGridProps {
  selectedLocation: string;
  /** Optional externally-controlled search. When omitted, the grid manages its own search state. */
  searchQuery?:     string;
  viewMode:         "grid" | "table";
  onAdjustStock?:   (stock: any) => void;
  /** When false (assigned staff), the grid is pinned to `selectedLocation` and hides Commissary. */
  canSwitchLocation?: boolean;
}

// Extends StockResponseDto with parsed fields
interface ParsedStock extends Omit<StockResponseDto, 'productName' | 'quantity'> {
  variationName: string;
  lowStockThreshold: number; // mock threshold for now, or fetch from low-stock api
  productName: string;
  quantity: number;
}

export function StockLevelGrid({ selectedLocation, searchQuery, viewMode, onAdjustStock, canSwitchLocation = true }: StockLevelGridProps) {
  const [stocks, setStocks] = useState<ParsedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Self-managed search state (mirrors ProductTable). Falls back to the controlled
  // `searchQuery` prop when one is provided by the parent.
  const [internalSearch, setInternalSearch] = useState("");
  const search = searchQuery !== undefined ? searchQuery : internalSearch;

  const { theme } = useTheme();
  const dark = theme === "dark";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const muted = dark ? "#8899aa" : "#667085";

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.apiPos.inventoryStockAllList();
        
        const parsed = data.map(s => {
          return {
            ...s,
            productName: s.productName || "Unknown",
            quantity: Number(s.quantity) || 0,
            variationName: s.variationName || "",
            lowStockThreshold: 50 // default mock threshold as API doesn't return it in allStock
          } as ParsedStock;
        });
        
        setStocks(parsed);
      } catch (err) {
        console.error("Failed to fetch stock:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStock();
  }, []);

  const filteredStocks = stocks.filter((stock) => {
    // Scoped (non-admin/owner) users are pinned to a single branch: the parent
    // sets `selectedLocation` to their assigned branch and locks the picker, so
    // filtering on it here restricts the grid to that location. We also keep
    // them out of the SCM Commissary (Location 999) which they can't touch.
    if (!canSwitchLocation) {
      if (stock.locationId === 999 || stock.locationName === "Commissary") return false;
      if (selectedLocation !== "All" && stock.locationName !== selectedLocation) return false;
    }

    const matchesLoc = selectedLocation === "All" || stock.locationName === selectedLocation;
    const q = (search || "").toLowerCase().trim();
    const matchesQuery = !q ||
      stock.productName.toLowerCase().includes(q) ||
      (stock.variationName || "").toLowerCase().includes(q) ||
      (stock.locationName || "").toLowerCase().includes(q);
    return matchesLoc && matchesQuery;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* Self-managed search (used when parent does not control searchQuery) */}
      {searchQuery === undefined && (
        <div className="mb-5">
          <input
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Search by product, variation, or location…"
            maxLength={25}
            className="w-full sm:max-w-[280px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      )}
      {viewMode === "table" ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variation</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Available Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Min. Threshold</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const isLowStock = stock.quantity <= stock.lowStockThreshold;

                  return (
                    <tr
                      key={stock.stockId}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {renderVariationBadges(stock.variationName || "", muted, border, inputBg, true)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-bold">
                        {stock.productName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          {stock.locationName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-base text-gray-900 dark:text-white">
                        {stock.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 font-medium">
                        {stock.lowStockThreshold}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isLowStock ? (
                            <span className="bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-error-100 dark:border-error-900/50 flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <path d="M12 9v4" />
                                <path d="M12 17h.01" />
                              </svg>
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-success-100 dark:border-success-900/50">
                              IN STOCK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {stock.locationId === 999 || stock.locationName === "Commissary" ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Read-only (SCM)</span>
                          ) : (
                            <button
                              onClick={() => onAdjustStock && onAdjustStock({ variationId: stock.variationId, location: stock.locationName, locationId: stock.locationId, quantity: stock.quantity, lowStockThreshold: stock.lowStockThreshold })}
                              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all shadow-sm ${
                                isLowStock 
                                  ? "bg-error-500 hover:bg-error-600 shadow-error-500/20" 
                                  : "bg-brand-500 hover:bg-brand-600 shadow-brand-500/20"
                              }`}
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredStocks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
              No items found matching the selected filters.
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const isLowStock = stock.quantity <= stock.lowStockThreshold;
              const stockPercent = Math.min((stock.quantity / (stock.lowStockThreshold * 2)) * 100, 100);

              return (
                <div
                  key={stock.stockId}
                  className={`relative group rounded-xl border bg-card transition-all duration-300 flex flex-col overflow-hidden ${
                    isLowStock 
                      ? "border-destructive/20 shadow-[0_2px_0_0_rgba(239,68,68,0.15)]" 
                      : "border-border shadow-[0_2px_0_0_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${isLowStock ? "bg-destructive/60" : "bg-primary/10"}`} />

                  <div className="p-4 sm:p-5 flex flex-col h-full">
                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {stock.locationName}
                        </span>
                        {isLowStock && (
                          <span className="flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-destructive/60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                        {stock.productName}
                      </h4>
                      <div className="mt-2">
                        {renderVariationBadges(stock.variationName || "", muted, border, inputBg, true)}
                      </div>
                    </div>

                    {/* Quantity + Status */}
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                            {stock.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            units
                          </span>
                        </div>

                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                              <path d="M12 9v4" />
                              <path d="M12 17h.01" />
                            </svg>
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-md bg-primary/5 text-foreground border border-border">
                            IN STOCK
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Threshold: {stock.lowStockThreshold}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {Math.round(stockPercent)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLowStock ? "bg-destructive" : "bg-foreground"
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action */}
                      {stock.locationId === 999 || stock.locationName === "Commissary" ? (
                        <button
                          disabled
                          className="w-full py-2.5 text-xs font-semibold rounded-lg cursor-not-allowed bg-muted text-muted-foreground border border-border"
                        >
                          Read-only (SCMS)
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAdjustStock) {
                              onAdjustStock({ variationId: stock.variationId, location: stock.locationName, locationId: stock.locationId, quantity: stock.quantity, lowStockThreshold: stock.lowStockThreshold });
                            }
                          }}
                          className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            isLowStock 
                              ? "bg-destructive text-white hover:bg-destructive/90 shadow-sm" 
                              : "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                          }`}
                        >
                          Adjust Stock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
