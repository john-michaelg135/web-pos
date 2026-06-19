import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";

interface SalesByChannelChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export function SalesByChannelChart({ dateFrom, dateTo }: SalesByChannelChartProps) {
  const [data, setData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(true);

  // Colors for pie chart (different palette from location to distinguish)
  const colors = ["#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.apiPos.analyticsSalesByChannelList({
          DateFrom: dateFrom || undefined,
          DateTo: dateTo || undefined,
        });

        const mappedData = res.data.map((d, i) => ({
          label: d.label || "Unknown",
          value: Number(d.totalRevenue) || 0,
          color: colors[i % colors.length],
        })).filter(d => d.value > 0);

        // Sort largest to smallest
        mappedData.sort((a, b) => b.value - a.value);

        setData(mappedData);
      } catch (error) {
        console.error("Failed to fetch Sales by Channel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate SVG stroke parameters for donut chart
  let cumulativePercent = 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sales by Channel</h3>
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setShowPercentage(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${showPercentage
                ? "bg-white dark:bg-gray-700 text-brand-500 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
          >
            Percentage
          </button>
          <button
            onClick={() => setShowPercentage(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${!showPercentage
                ? "bg-white dark:bg-gray-700 text-brand-500 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
          >
            Amount
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center p-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex justify-center items-center p-8 text-gray-400">
          No data available for this period.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 justify-center">
          {/* Donut Chart SVG */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              {data.map((item) => {
                const percent = item.value / total;
                const dasharray = `${percent * circumference} ${circumference}`;
                const dashoffset = cumulativePercent * circumference;
                cumulativePercent += percent;

                return (
                  <circle
                    key={item.label}
                    r={radius}
                    cx="18"
                    cy="18"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="4"
                    strokeDasharray={dasharray}
                    strokeDashoffset={-dashoffset}
                    className="transition-all duration-1000 ease-out cursor-pointer hover:opacity-80"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
              <span className="text-xs font-black text-gray-900 dark:text-white">
                ₱{total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 w-full max-w-[150px]">
            {data.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600 dark:text-gray-300 truncate font-medium">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white ml-2">
                  {showPercentage 
                    ? `${Math.round((item.value / total) * 100)}%`
                    : `₱${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
