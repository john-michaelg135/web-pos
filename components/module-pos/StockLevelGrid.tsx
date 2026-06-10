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
  searchQuery:      string;
  viewMode:         "grid" | "table";
  onAdjustStock?:   (stock: any) => void;
}

// Extends StockResponseDto with parsed fields
interface ParsedStock extends Omit<StockResponseDto, 'productName' | 'quantity'> {
  variationName: string;
  lowStockThreshold: number; // mock threshold for now, or fetch from low-stock api
  productName: string;
  quantity: number;
}

export function StockLevelGrid({ selectedLocation, searchQuery, viewMode, onAdjustStock }: StockLevelGridProps) {
  const [stocks, setStocks] = useState<ParsedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    const matchesLoc = selectedLocation === "All" || stock.locationName === selectedLocation;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      stock.productName.toLowerCase().includes(q) ||
      (stock.variationName || "").toLowerCase().includes(q);
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
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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

              return (
                <div
                  key={stock.stockId}
                  className={`relative bg-white dark:bg-gray-900 border ${
                    isLowStock ? "border-error-200 dark:border-error-800" : "border-gray-200 dark:border-gray-700"
                  } rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300 flex flex-col`}
                >
                  {isLowStock && (
                    <div className="absolute top-4 right-4 animate-pulse">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-error-500"></span>
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col h-full">
                    <div className="mb-3 sm:mb-4">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {stock.locationName}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 leading-tight uppercase">
                        {stock.productName}
                      </h4>
                      <div className="mt-2">
                        {renderVariationBadges(stock.variationName || "", muted, border, inputBg, true)}
                      </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                          {stock.quantity}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 ml-1.5">
                          units
                        </span>
                      </div>

                      {isLowStock ? (
                        <div className="bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-error-100 dark:border-error-900/50 flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                          </svg>
                          LOW STOCK
                        </div>
                      ) : (
                        <div className="bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-success-100 dark:border-success-900/50">
                          IN STOCK
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 dark:text-gray-500">Threshold: {stock.lowStockThreshold} units</span>
                        <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isLowStock ? "bg-error-500" : "bg-success-500"}`}
                            style={{ width: `${Math.min((stock.quantity / (stock.lowStockThreshold * 2)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAdjustStock) {
                            onAdjustStock({ variationId: stock.variationId, location: stock.locationName, locationId: stock.locationId, quantity: stock.quantity, lowStockThreshold: stock.lowStockThreshold });
                          }
                        }}
                        className={`w-full py-2 text-white text-xs font-bold rounded-lg transition-all shadow-sm ${
                          isLowStock 
                            ? "bg-error-500 hover:bg-error-600 shadow-error-500/20" 
                            : "bg-brand-500 hover:bg-brand-600 shadow-brand-500/20"
                        }`}
                      >
                        Adjust Stock
                      </button>
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
