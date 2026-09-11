"use client";

import type { StockMovement } from "./types";
import { MOCK_VARIATIONS, MOCK_PRODUCTS } from "./productData";
import { renderVariationBadges } from "./utils";
import { useTheme as useRealTheme } from "@/context/ThemeContext";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

interface StockMovementTableProps {
  movements: StockMovement[];
}

export function StockMovementTable({ movements }: StockMovementTableProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const muted = dark ? "#8899aa" : "#667085";
  return (
    <div className="w-full min-w-0">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stock History Log</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Recent stock arrivals and adjustments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Product</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center whitespace-nowrap">Qty</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell whitespace-nowrap">Type</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell whitespace-nowrap">Reference</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                [...movements].reverse().map((m) => {
                  const variation = MOCK_VARIATIONS.find(v => v.id === m.variationId);
                  const product = MOCK_PRODUCTS.find(p => p.id === variation?.productId);
                  
                  const pName = m.productName || product?.name || "Unknown";
                  const vName = m.variationName || variation?.size || "";
                  
                  return (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {(() => {
                          try {
                            const d = new Date(m.date);
                            if (isNaN(d.getTime())) return m.date;
                            const yyyy = d.getFullYear();
                            const mm = d.getMonth() + 1;
                            const dd = d.getDate();
                            let hours = d.getHours();
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12; // the hour '0' should be '12'
                            return `${mm}/${dd}/${yyyy} ${hours}:${minutes} ${ampm}`;
                          } catch (e) {
                            return m.date;
                          }
                        })()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-[11px] sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {pName}
                        </div>
                        {vName && (
                          <div className="mt-1">
                            {renderVariationBadges(vName, muted, border, inputBg, true)}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 sm:px-6 py-4 text-sm font-bold text-center whitespace-nowrap ${m.quantity > 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          m.type === "arrival" ? "bg-success-50 dark:bg-success-500/10 text-success-600" :
                          m.type === "sale" ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600" :
                          "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white hidden lg:table-cell whitespace-nowrap">
                        {m.reference}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-400 dark:text-gray-500 hidden sm:table-cell whitespace-nowrap">
                        {m.notes || "-"}
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
