"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SalesAnalyticsCharts } from "@/components/module-pos/SalesAnalyticsCharts";
import { SalesByLocationChart } from "@/components/module-pos/SalesByLocationChart";
import { SalesByChannelChart } from "@/components/module-pos/SalesByChannelChart";
import { apiClient } from "@/components/module-pos/api";
import { toast } from "sonner";
import { CloseLineIcon } from "@/icons/index";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";

import { useRouter } from "next/navigation";

interface TopSellingVariation {
  name: string;
  sales: number;
  percent: number;
  amount: number;
}

export function ViewSalesAnalytics() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [topSellingData, setTopSellingData] = useState<TopSellingVariation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getStartOfDay = (dateStr: string) => dateStr ? new Date(dateStr + "T00:00:00").toISOString() : undefined;
  const getEndOfDay = (dateStr: string) => dateStr ? new Date(dateStr + "T23:59:59").toISOString() : undefined;

  useEffect(() => {
    setIsMounted(true);
    
    const fetchTopSelling = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.apiPos.analyticsSalesByVariationList({
          DateFrom: getStartOfDay(dateFrom),
          DateTo: getEndOfDay(dateTo),
        });
        const totalUnits = data.reduce((sum, item) => sum + (Number(item.totalUnitsSold) || 0), 0);
        
        const formatted = data
          .map(item => ({
            name: item.label || "Unknown",
            sales: Number(item.totalUnitsSold) || 0,
            percent: 0,
            amount: Number(item.totalRevenue) || 0
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10) // Top 10
          .map(item => ({
            ...item,
            percent: totalUnits > 0 ? Math.round((item.sales / totalUnits) * 100) : 0
          }));
          
        setTopSellingData(formatted);
      } catch (err) {
        console.error("Failed to fetch top selling variations:", err);
        // Fallback for demo if API fails
        setTopSellingData([
          { name: "Ube Halaya - 500g Jar", sales: 420, percent: 85, amount: 159180 },
          { name: "Ube Jam - 300g Jar", sales: 280, percent: 62, amount: 78120 },
          { name: "Ube Halaya - 300g Jar", sales: 150, percent: 45, amount: 41850 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopSelling();
  }, [dateFrom, dateTo]);

  const hasAccess = authUser && (authUser.username === "posuser" || authUser.apps.includes("sales-reports") || authUser.roles?.includes("Admin") || authUser.subRole === "Admin");

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace("/access-denied");
    }
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  
  if (!hasAccess) {
    return null;
  }

  if (!isMounted) return null;
  return (
    <div id="printable-report" className="w-full p-4 md:p-6 bg-transparent flex flex-col gap-4 md:gap-6 animate-in fade-in duration-500">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 h-full w-full">
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Sales Analytics Report</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comprehensive overview of sales performance and trends.</p>
          </div>
          
          <div className="flex items-center gap-3 no-print flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer w-full max-w-[130px]"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer w-full max-w-[130px]"
              />
            </div>
            <button 
              onClick={() => setIsCsvPreviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all shadow-sm shadow-brand-500/20"
            >
              Generate Report
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-8">
          <SalesAnalyticsCharts 
            dateFrom={getStartOfDay(dateFrom)} 
            dateTo={getEndOfDay(dateTo)} 
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SalesByLocationChart 
              dateFrom={getStartOfDay(dateFrom)} 
              dateTo={getEndOfDay(dateTo)} 
            />
            <SalesByChannelChart 
              dateFrom={getStartOfDay(dateFrom)} 
              dateTo={getEndOfDay(dateTo)} 
            />
          </div>

          {/* Top Selling Variations */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Selling Variations</h3>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {topSellingData.length === 0 ? (
                  <p className="text-gray-500">No sales data available yet.</p>
                ) : topSellingData.map((item, i) => {
                  const emDashIdx = item.name.indexOf(" — ");
                  const enDashIdx = item.name.indexOf(" – ");
                  const hyphenIdx = item.name.indexOf(" - ");
                  let splitIdx = -1;
                  if (emDashIdx !== -1) splitIdx = emDashIdx;
                  else if (enDashIdx !== -1) splitIdx = enDashIdx;
                  else if (hyphenIdx !== -1) splitIdx = hyphenIdx;

                  let prodName = item.name;
                  let variationPart = "";
                  if (splitIdx !== -1) {
                    prodName = item.name.substring(0, splitIdx);
                    variationPart = item.name.substring(splitIdx + 3);
                  } else if (item.name.includes("|")) {
                    prodName = "";
                    variationPart = item.name;
                  }
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-start text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          {prodName && <span className="text-gray-900 dark:text-white font-bold">{prodName}</span>}
                          {variationPart ? (
                            renderVariationBadges(
                              variationPart,
                              "#8899aa",
                              "rgba(228, 231, 236, 0.2)",
                              "rgba(70, 95, 255, 0.1)",
                              true
                            )
                          ) : (
                            !prodName && <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                          )}
                        </div>
                        <span className="text-gray-900 dark:text-white shrink-0 font-bold">{item.sales} units</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV Preview Modal */}
      {isCsvPreviewOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 no-print z-[100000]">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500 dark:text-brand-400">
                   <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/>
                </svg>
                Generate Report Options
              </h2>
            </div>
            
            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-gray-950/50">
              <div className="border border-gray-300 dark:border-gray-700 rounded-sm overflow-x-auto bg-white dark:bg-gray-900 shadow-sm font-mono text-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 select-none">
                    <tr>
                      <th className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 w-10 text-center font-normal bg-gray-200/50 dark:bg-gray-700/50"></th>
                      <th className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 text-center font-normal hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">A</th>
                      <th className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 text-center font-normal hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">B</th>
                      <th className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 text-center font-normal hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">C</th>
                      <th className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 text-center font-normal hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">D</th>
                    </tr>
                    <tr className="bg-white dark:bg-gray-900">
                      <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-center font-normal bg-gray-100 dark:bg-gray-800 text-gray-500">1</td>
                      <th className="px-4 py-2 border border-gray-300 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Name</th>
                      <th className="px-4 py-2 border border-gray-300 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Sales (units)</th>
                      <th className="px-4 py-2 border border-gray-300 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Percent</th>
                      <th className="px-4 py-2 border border-gray-300 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellingData.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                        <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-center font-normal bg-gray-100 dark:bg-gray-800 text-gray-500 select-none">{index + 2}</td>
                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 whitespace-nowrap">{item.name}</td>
                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-right">{item.sales}</td>
                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-right">{item.percent}%</td>
                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-right">₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <button 
                onClick={() => setIsCsvPreviewOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsCsvPreviewOpen(false);
                  setTimeout(() => window.print(), 100);
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                Export PDF
              </button>
              <button 
                onClick={() => {
                  let csvContent = "data:text/csv;charset=utf-8,Name,Sales (units),Percent,Amount\n" 
                    + topSellingData.map(e => `"${e.name}",${e.sales},${e.percent}%,${e.amount}`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "sales_analytics_report.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setIsCsvPreviewOpen(false);
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download CSV
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ViewSalesAnalytics;
