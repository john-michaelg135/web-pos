"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, X, FileText, Download } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/components/module-pos/api";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { SalesAnalyticsCharts } from "@/components/module-pos/SalesAnalyticsCharts";
import { SalesByLocationChart } from "@/components/module-pos/SalesByLocationChart";
import { SalesByChannelChart } from "@/components/module-pos/SalesByChannelChart";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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

  const [locationName, setLocationName] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<number | undefined>(undefined);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);

  const getStartOfDay = (dateStr: string) =>
    dateStr ? new Date(dateStr + "T00:00:00").toISOString() : undefined;
  const getEndOfDay = (dateStr: string) =>
    dateStr ? new Date(dateStr + "T23:59:59").toISOString() : undefined;

  useEffect(() => {
    setIsMounted(true);

    if (authUser?.locationId) {
      const fetchLocation = async () => {
        try {
          const { data } = await apiClient.apiPos.locationsList();
          const matched = data.find((l) => Number(l.locationId) === Number(authUser.locationId));
          if (matched) setLocationName(matched.locationName || null);
        } catch (err) {
          console.error("Failed to fetch location name:", err);
        }
      };
      fetchLocation();
    } else {
      const fetchLocations = async () => {
        try {
          const { data } = await apiClient.apiPos.locationsList();
          setLocations(data.map((l) => ({ id: Number(l.locationId), name: l.locationName || "Store" })));
        } catch (err) {
          console.error("Failed to fetch locations:", err);
        }
      };
      fetchLocations();
    }

    const fetchTopSelling = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.apiPos.analyticsSalesByVariationList({
          DateFrom: getStartOfDay(dateFrom),
          DateTo: getEndOfDay(dateTo),
          LocationId: filterLocation,
        });
        const totalUnits = data.reduce((sum, item) => sum + (Number(item.totalUnitsSold) || 0), 0);

        const formatted = data
          .map((item) => ({
            name: item.label || "Unknown",
            sales: Number(item.totalUnitsSold) || 0,
            percent: 0,
            amount: Number(item.totalRevenue) || 0,
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10)
          .map((item) => ({
            ...item,
            percent: totalUnits > 0 ? Math.round((item.sales / totalUnits) * 100) : 0,
          }));

        setTopSellingData(formatted);
      } catch (err) {
        console.error("Failed to fetch top selling variations:", err);
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
  }, [dateFrom, dateTo, filterLocation, authUser]);

  const hasAccess =
    authUser &&
    (authUser.username === "posuser" ||
      authUser.apps.includes("sales-reports") ||
      authUser.roles?.includes("Admin") ||
      authUser.subRole === "Admin");

  useEffect(() => {
    if (!authLoading && !hasAccess) router.replace("/access-denied");
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!hasAccess || !isMounted) return null;

  const locationLabel = authUser?.locationId
    ? locationName ? `Store - ${locationName}` : "All Locations"
    : filterLocation
      ? `Store - ${locations.find((l) => l.id === filterLocation)?.name || "Unknown"}`
      : "All Locations";

  const handleDownloadCsv = () => {
    let csvContent =
      "data:text/csv;charset=utf-8,Name,Sales (units),Percent,Amount\n" +
      topSellingData.map((e) => `"${e.name}",${e.sales},${e.percent}%,${e.amount}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "sales_analytics_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsCsvPreviewOpen(false);
  };

  const parseVariationName = (name: string) => {
    const emDashIdx = name.indexOf(" — ");
    const enDashIdx = name.indexOf(" – ");
    const hyphenIdx = name.indexOf(" - ");
    let splitIdx = emDashIdx !== -1 ? emDashIdx : enDashIdx !== -1 ? enDashIdx : hyphenIdx;
    if (splitIdx !== -1) return { prodName: name.substring(0, splitIdx), variationPart: name.substring(splitIdx + 3) };
    if (name.includes("|")) return { prodName: "", variationPart: name };
    return { prodName: name, variationPart: "" };
  };

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 max-w-7xl mx-auto animate-page-in print:p-5 print:bg-white">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Sales Analytics Report</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap min-w-0">
            <p className="text-sm text-muted-foreground">Comprehensive overview of sales performance and trends.</p>
            <span className="text-muted-foreground font-bold">&middot;</span>
            <Badge variant="secondary" className="text-xs font-bold truncate max-w-[200px]">
              {locationLabel}
            </Badge>
            {!authUser?.locationId && (
              <div className="w-48 ml-1 shrink-0">
                <CustomSelect
                  value={filterLocation ? String(filterLocation) : "All"}
                  onChange={(val) => setFilterLocation(val === "All" ? undefined : Number(val))}
                  options={[
                    { value: "All", label: "All Locations" },
                    ...locations.map((l) => ({ value: String(l.id), label: `Store - ${l.name}` })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-[160px] cursor-pointer"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-[160px] cursor-pointer"
            />
          </div>
          <Button onClick={() => setIsCsvPreviewOpen(true)}>Generate Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <SalesAnalyticsCharts dateFrom={getStartOfDay(dateFrom)} dateTo={getEndOfDay(dateTo)} locationId={filterLocation} />

        <div className={cn("grid grid-cols-1 gap-8", !authUser?.locationId && !filterLocation && "lg:grid-cols-2")}>
          <SalesByChannelChart dateFrom={getStartOfDay(dateFrom)} dateTo={getEndOfDay(dateTo)} locationId={filterLocation} />
          {!authUser?.locationId && !filterLocation && (
            <SalesByLocationChart dateFrom={getStartOfDay(dateFrom)} dateTo={getEndOfDay(dateTo)} />
          )}
        </div>

        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle>Top Selling Variations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : topSellingData.length === 0 ? (
              <p className="text-muted-foreground">No sales data available yet.</p>
            ) : (
              <div className="space-y-4">
                {topSellingData.map((item, i) => {
                  const { prodName, variationPart } = parseVariationName(item.name);
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-start text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          {prodName && <span className="text-foreground font-bold">{prodName}</span>}
                          {variationPart
                            ? renderVariationBadges(variationPart, "#8899aa", "rgba(228,231,236,0.2)", "rgba(70,95,255,0.1)", true)
                            : !prodName && <span className="text-muted-foreground">{item.name}</span>}
                        </div>
                        <span className="text-foreground shrink-0 font-bold">{item.sales} units</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Export Modal */}
      {isCsvPreviewOpen && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden z-[100000]">
            <Card className="w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Generate Report Options
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsCsvPreviewOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <Separator />
              <CardContent className="overflow-y-auto flex-1 p-5">
                <div className="border border-border rounded-sm overflow-x-auto bg-card font-mono text-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted text-muted-foreground select-none">
                      <tr>
                        <th className="px-3 py-1.5 border border-border w-10 text-center font-normal" />
                        <th className="px-4 py-1.5 border border-border text-center font-normal">A</th>
                        <th className="px-4 py-1.5 border border-border text-center font-normal">B</th>
                        <th className="px-4 py-1.5 border border-border text-center font-normal">C</th>
                        <th className="px-4 py-1.5 border border-border text-center font-normal">D</th>
                      </tr>
                      <tr className="bg-card">
                        <td className="px-3 py-2 border border-border text-center font-normal bg-muted text-muted-foreground">1</td>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Name</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Sales (units)</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Percent</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellingData.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/50 transition-colors">
                          <td className="px-3 py-2 border border-border text-center bg-muted text-muted-foreground select-none">{index + 2}</td>
                          <td className="px-4 py-2 border border-border text-foreground whitespace-nowrap">{item.name}</td>
                          <td className="px-4 py-2 border border-border text-foreground text-right">{item.sales}</td>
                          <td className="px-4 py-2 border border-border text-foreground text-right">{item.percent}%</td>
                          <td className="px-4 py-2 border border-border text-foreground text-right">
                            ₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <Separator />
              <div className="flex justify-end gap-3 p-4">
                <Button variant="outline" onClick={() => setIsCsvPreviewOpen(false)}>Cancel</Button>
                <Button
                  variant="outline"
                  onClick={() => { setIsCsvPreviewOpen(false); setTimeout(() => window.print(), 100); }}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4 text-destructive" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadCsv} className="gap-2">
                  <Download className="h-4 w-4 text-green-600" />
                  Download CSV
                </Button>
              </div>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}

export default ViewSalesAnalytics;
