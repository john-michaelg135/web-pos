"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";

interface AnalyticsData {
  date: string;
  sales: number;
  orders: number;
}

interface SalesAnalyticsChartsProps {
  dateFrom?: string;
  dateTo?: string;
  locationId?: number;
}

export function SalesAnalyticsCharts({ dateFrom, dateTo, locationId }: SalesAnalyticsChartsProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
  const [activeData, setActiveData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Summaries
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Map timeframe to groupBy
        const groupBy = timeframe === "daily" ? "Day" : timeframe === "weekly" ? "Week" : "Month";
        
        // Let's get the last 30 days/weeks/months
        const { data } = await apiClient.apiPos.analyticsRevenueList({ 
          GroupBy: groupBy,
          DateFrom: dateFrom || undefined,
          DateTo: dateTo || undefined,
          LocationId: locationId,
        });
        
        let totalRev = 0;
        let totalOrd = 0;
        
        const mappedData = data.map(d => {
          totalRev += Number(d.totalRevenue) || 0;
          totalOrd += Number(d.totalOrders) || 0;
          return {
            date: d.period || "N/A",
            sales: Number(d.totalRevenue) || 0,
            orders: Number(d.totalOrders) || 0
          };
        });
        
        // Reverse to show oldest to newest left to right if API returns descending
        // If API returns newest first, reverse it. Let's assume chronological
        if (mappedData.length > 0 && mappedData[0].date > mappedData[mappedData.length - 1].date) {
            mappedData.reverse();
        }
        
        setRevenue(totalRev);
        setOrders(totalOrd);
        
        // Take last 7 for daily to fit chart nicely if daily, or keep all
        const displayData = timeframe === "daily" ? mappedData.slice(-7) : mappedData;
        
        setActiveData(displayData.length > 0 ? displayData : [
          // Fallback if empty
          { date: "N/A", sales: 0, orders: 0 }
        ]);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        // Fallback for demo
        setActiveData([
          { date: "N/A", sales: 0, orders: 0 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [timeframe, dateFrom, dateTo, locationId]);

  const maxSales = Math.max(...activeData.map(d => d.sales), 1000); // minimum max of 1000 to avoid division by zero
  const averageOrderValue = orders > 0 ? revenue / orders : 0;
  
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sales Revenue</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tracking performance trends over time</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(["daily", "weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                timeframe === t 
                  ? "bg-white dark:bg-gray-700 text-foreground dark:text-white shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>



      <div className="relative h-[300px] w-full mt-4">
        {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : (
            <>
                {/* Y-Axis Labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 font-medium py-2">
                <span>₱{(maxSales * 1.2 / 1000).toFixed(1)}k</span>
                <span>₱{(maxSales * 0.9 / 1000).toFixed(1)}k</span>
                <span>₱{(maxSales * 0.6 / 1000).toFixed(1)}k</span>
                <span>₱{(maxSales * 0.3 / 1000).toFixed(1)}k</span>
                <span>0</span>
                </div>

                {/* Grid Lines */}
                <div className="absolute left-10 right-0 top-0 h-full flex flex-col justify-between py-2 pointer-events-none">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-full border-t border-gray-100 dark:border-gray-800/50 border-dashed"></div>
                ))}
                </div>



                {/* Chart Content */}
                <div className="absolute left-10 right-0 top-0 h-full flex items-end justify-around px-4">
                {activeData.map((d, i) => {
                    const height = (d.sales / (maxSales * 1.2)) * 100;
                    
                    return (
                    <div key={i} className="group relative flex flex-col items-center justify-end h-full flex-1 max-w-[60px]">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            ₱{d.sales.toLocaleString()}
                        </div>
                        <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1"></div>
                        </div>

                        <div 
                            className="w-4/5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white rounded-t-md transition-all duration-500 ease-out cursor-pointer shadow-sm"
                            style={{ height: `${height}%` }}
                        ></div>
                        
                        <span className="absolute top-full mt-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 rotate-[30deg] origin-left whitespace-nowrap">
                        {timeframe === "daily" ? d.date.split('-').slice(1).join('/') : d.date}
                        </span>
                    </div>
                    );
                })}
                </div>
            </>
        )}
      </div>

      {/* Dynamic Summary Cards */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Revenue</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
                ₱{revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Average Order Value</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
                ₱{averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Orders Count</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">{orders.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
