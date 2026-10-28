"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, X, FileText, Download, Printer } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { isManager } from "@/lib/portal/roles";
import { useMyLocations } from "@/lib/useMyLocations";
import { apiClient } from "@/components/module-pos/api";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import {
  SalesReport,
  formatPeriod,
  salesReportCsv,
  type SalesReportData,
} from "@/components/module-pos/SalesReport";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewStartingCash, type StartingCashRecord } from "./ViewStartingCash";

type PeriodPreset = "this-month" | "last-month" | "this-quarter" | "year-to-date" | "all" | "custom";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "year-to-date", label: "Year to date" },
  { value: "all", label: "All dates" },
  { value: "custom", label: "Custom range" },
];

// Earliest date with sales records.
const MIN_REPORT_DATE = "2026-07-10";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Philippine calendar date range for a preset, as YYYY-MM-DD strings. */
function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date(Date.now() + 8 * 3600_000); // Manila "now", read with UTC getters
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const todayStr = ymd(today);
  switch (preset) {
    case "this-month":
      return { from: ymd(new Date(Date.UTC(y, m, 1))), to: todayStr };
    case "last-month":
      return { from: ymd(new Date(Date.UTC(y, m - 1, 1))), to: ymd(new Date(Date.UTC(y, m, 0))) };
    case "this-quarter":
      return { from: ymd(new Date(Date.UTC(y, m - (m % 3), 1))), to: todayStr };
    case "year-to-date":
      return { from: ymd(new Date(Date.UTC(y, 0, 1))), to: todayStr };
    default:
      return { from: "", to: "" };
  }
}

export function ViewSalesAnalytics() {
  const { user: authUser, isLoading: authLoading, canRead, can } = useAuth();
  const { scope: locScope, locations: myLocations, isLoading: locLoading, isUnassigned } =
    useMyLocations();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("this-month");
  const [dateFrom, setDateFrom] = useState(() => presetRange("this-month").from);
  const [dateTo, setDateTo] = useState(() => presetRange("this-month").to);
  const [reportData, setReportData] = useState<SalesReportData | null>(null);

  const [locationName, setLocationName] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<number | undefined>(undefined);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [moneyAuditRecords, setMoneyAuditRecords] = useState<StartingCashRecord[]>([]);

  const isManagerUser = isManager(authUser?.role);
  const canMoneyAudit = !!authUser &&
    (authUser.isSuperUser || isManagerUser || can(POS_MODULES.ORDER_MANAGEMENT, "approve"));
  const [activeTab, setActiveTab] = useState<"analytics" | "money-audit">("analytics");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "money-audit" || tabParam === "analytics") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (val: "analytics" | "money-audit") => {
    setActiveTab(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", val);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handlePresetChange = (next: PeriodPreset) => {
    setPreset(next);
    if (next === "custom") return; // keep the current dates as the starting point
    const range = presetRange(next);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  // Report days are Philippine days (UTC+8), whatever time zone the browser is in.
  const getStartOfDay = (dateStr: string) =>
    dateStr ? new Date(dateStr + "T00:00:00+08:00").toISOString() : undefined;
  const getEndOfDay = (dateStr: string) =>
    dateStr ? new Date(dateStr + "T23:59:59.999+08:00").toISOString() : undefined;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Populate the location selector according to the user's runtime scope.
  // Super users (scope "all") pick from every location; assigned users are
  // constrained to their branch(es) and locked to their (single) branch.
  useEffect(() => {
    if (locLoading) return;

    const populateLocations = async () => {
      if (locScope === "assigned") {
        const scoped = myLocations.map((l) => ({
          id: l.locationId,
          name: l.locationName || "Store",
        }));
        setLocations(scoped);
        if (scoped.length === 1) {
          setLocationName(scoped[0].name);
          setFilterLocation(scoped[0].id);
        } else if (scoped.length > 1) {
          // Multi-branch (e.g. a manager) — default to first, still selectable.
          setFilterLocation((prev) => prev ?? scoped[0].id);
        }
        return;
      }

      // Super user: fetch all locations for the selector.
      try {
        const { data } = await apiClient.apiPos.locationsList();
        setLocations(
          data
            .filter((l) => l.isActive)
            .map((l) => ({ id: Number(l.locationId), name: l.locationName || "Store" }))
        );
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };

    void populateLocations();
  }, [locScope, locLoading, myLocations]);

  const hasAccess = !!authUser && canRead(POS_MODULES.SALES_REPORTS);

  useEffect(() => {
    if (!authLoading && !hasAccess) router.replace("/no-access");
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading || locLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!hasAccess || !isMounted) return null;

  // Non-super user with no assigned branch: gate the location-scoped report.
  if (isUnassigned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-lg font-semibold text-foreground">No location assigned</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          You haven&apos;t been assigned to a branch yet. Ask an administrator to
          assign your location in Location Management to view sales reports.
        </p>
      </div>
    );
  }

  // Location scoping:
  //  - super users: free selector across all locations (default "All Locations")
  //  - assigned to 1 branch: locked to that branch, no selector
  //  - assigned to N branches: selector limited to those branches
  const isLocked = locScope === "assigned" && myLocations.length === 1;
  const canPickAll = locScope === "all";
  const showLocationSelector = canPickAll || (locScope === "assigned" && myLocations.length > 1);

  const auditLocation = isManagerUser && locScope === "assigned" ? myLocations[0] : undefined;
  const branchName = isLocked
    ? locationName ?? myLocations[0]?.locationName ?? "Unknown"
    : filterLocation
      ? locations.find((l) => l.id === filterLocation)?.name || "Unknown"
      : null;
  const locationLabel = activeTab === "money-audit" && auditLocation
    ? `Store - ${auditLocation.locationName || "Unknown"}`
    : branchName
      ? `Store - ${branchName}`
      : "All Locations";

  const reportMeta = {
    periodLabel: formatPeriod(getStartOfDay(dateFrom) ?? null, getEndOfDay(dateTo) ?? null),
    branchLabel: branchName ?? "All branches",
    preparedBy: authUser?.name || authUser?.username || "",
  };

  const downloadFile = (content: string, filename: string) => {
    // BOM so Excel reads the peso sign and accents correctly.
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reportFileStem = () => {
    const branch = (branchName ?? "all-branches").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const period = dateFrom || dateTo ? `${dateFrom || "start"}_to_${dateTo || "today"}` : "all-dates";
    return `sales-report_${branch}_${period}`;
  };

  const handleDownloadReportCsv = () => {
    if (!reportData) return;
    downloadFile(salesReportCsv(reportData, reportMeta), `${reportFileStem()}.csv`);
  };

  const handleDownloadMoneyAuditCsv = () => {
    const csvContent =
      "Date,Cashier,Branch,Recorded At,Starting Cash,Successful Sales,Approved Refunds,Closed By,End Shift Cash,Expected Cash,Shortage\n" +
      moneyAuditRecords
        .map(
          (r) =>
            `"${r.businessDate}","${r.cashierName}","${r.locationName || `Branch ${r.locationId}`}","${new Date(r.createdAt).toLocaleString()}","${r.amount}","${r.successfulSalesAmount ?? ""}","${r.approvedRefundAmount ?? ""}","${r.endShiftCashierName ?? ""}","${r.endShiftAmount ?? ""}","${r.expectedCash ?? ""}","${r.cashShortage ?? ""}"`
        )
        .join("\n");
    downloadFile(csvContent, "starting_cash_audit_report.csv");
    setIsCsvPreviewOpen(false);
  };

  const printPage = (title: string) => {
    const originalTitle = document.title;
    document.title = title;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 250);
  };

  const dateInputs = (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        min={MIN_REPORT_DATE}
        max={dateTo || undefined}
        value={dateFrom}
        onChange={(e) => {
          const val = e.target.value;
          if (val && val < MIN_REPORT_DATE) return;
          setPreset("custom");
          setDateFrom(val);
        }}
        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
        className="w-[150px] cursor-pointer"
      />
      <span className="text-muted-foreground text-sm">to</span>
      <Input
        type="date"
        min={dateFrom || MIN_REPORT_DATE}
        value={dateTo}
        onChange={(e) => {
          const val = e.target.value;
          if (val && val < MIN_REPORT_DATE) return;
          setPreset("custom");
          setDateTo(val);
        }}
        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
        className="w-[150px] cursor-pointer"
      />
    </div>
  );

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 animate-page-in print:py-2 print:px-0 print:m-0 print:w-full print:max-w-none print:bg-white">
      <div className="flex flex-col gap-5 print:hidden">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Sales Report</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap min-w-0">
            <p className="text-sm text-muted-foreground">
              {activeTab === "analytics"
                ? "Company sales for a period, compared with the period before."
                : "Starting cash, sales and the end-of-shift count for each shift."}
            </p>
            <span className="text-muted-foreground font-bold">&middot;</span>
            <Badge variant="secondary" className="text-xs font-bold truncate max-w-[200px]">
              {locationLabel}
            </Badge>
            {showLocationSelector && !(activeTab === "money-audit" && isManagerUser) && (
              <div className="w-48 ml-1 shrink-0">
                <CustomSelect
                  value={filterLocation ? String(filterLocation) : "All"}
                  onChange={(val) => setFilterLocation(val === "All" ? undefined : Number(val))}
                  options={[
                    // Only super users get the "All Locations" aggregate option.
                    ...(canPickAll ? [{ value: "All", label: "All Locations" }] : []),
                    ...locations.map((l) => ({ value: String(l.id), label: `Store - ${l.name}` })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Toolbar on its own row so the period controls never squeeze the title and location badge. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</span>
            {/* CustomSelect has a 180px minimum width; a narrower box lets it overlap the next control. */}
            <div className="w-[180px] shrink-0">
              <CustomSelect
                value={preset}
                onChange={(val) => handlePresetChange(val as PeriodPreset)}
                options={PERIOD_OPTIONS}
              />
            </div>
            {(preset === "custom" || activeTab === "money-audit") && dateInputs}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "analytics" ? (
              <>
                <Button variant="outline" className="gap-2" disabled={!reportData} onClick={handleDownloadReportCsv}>
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button className="gap-2" disabled={!reportData} onClick={() => printPage(`${reportFileStem()} | Sales Report`)}>
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsCsvPreviewOpen(true)}>Generate Report</Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as "analytics" | "money-audit")} className="space-y-6">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-2 p-0 print:hidden">
          {[
            { value: "analytics", label: "Sales Report" },
            ...(canMoneyAudit ? [{ value: "money-audit", label: "Money Audit" }] : []),
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-t-lg rounded-b-none px-4 py-2.5 text-sm font-semibold border transition-colors data-[state=active]:shadow-none",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary",
                "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-border"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="analytics" className="mt-0">
          <SalesReport
            dateFrom={getStartOfDay(dateFrom)}
            dateTo={getEndOfDay(dateTo)}
            locationId={filterLocation}
            onData={setReportData}
            {...reportMeta}
          />
        </TabsContent>

        {canMoneyAudit && (
          <TabsContent value="money-audit" className="space-y-6 mt-0">
            {(dateFrom || dateTo) && (
              <p className="hidden print:block text-xs text-muted-foreground">
                Report Period: {dateFrom || "Earliest"} to {dateTo || "Latest"}
              </p>
            )}
            <ViewStartingCash
              embedded
              locationId={isManagerUser && locScope === "assigned"
                ? myLocations[0]?.locationId
                : filterLocation ?? (locScope === "assigned" && myLocations.length > 0 ? myLocations[0].locationId : undefined)}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onRecordsChange={setMoneyAuditRecords}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Money Audit export modal */}
      {isCsvPreviewOpen && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden z-[100000]">
            <Card className="w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Generate Starting Cash Report
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
                        <th className="px-4 py-1.5 border border-border text-center font-normal">E</th>
                      </tr>
                      <tr className="bg-card">
                        <td className="px-3 py-2 border border-border text-center font-normal bg-muted text-muted-foreground">1</td>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Date</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Cashier</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Branch</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Recorded At</th>
                        <th className="px-4 py-2 border border-border font-semibold text-foreground">Starting Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneyAuditRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-sans">
                            No starting cash records found for the selected date range.
                          </td>
                        </tr>
                      ) : (
                        moneyAuditRecords.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/50 transition-colors">
                            <td className="px-3 py-2 border border-border text-center bg-muted text-muted-foreground select-none">{index + 2}</td>
                            <td className="px-4 py-2 border border-border text-foreground whitespace-nowrap">{item.businessDate}</td>
                            <td className="px-4 py-2 border border-border text-foreground">{item.cashierName}</td>
                            <td className="px-4 py-2 border border-border text-foreground">{item.locationName || `Branch ${item.locationId}`}</td>
                            <td className="px-4 py-2 border border-border text-foreground text-muted-foreground text-xs">
                              {new Date(item.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 border border-border text-foreground text-right font-medium">
                              ₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <Separator />
              <div className="flex justify-end gap-3 p-4">
                <Button variant="outline" onClick={() => setIsCsvPreviewOpen(false)}>Cancel</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCsvPreviewOpen(false);
                    printPage("Money Audit Report | ERP System");
                  }}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4 text-destructive" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadMoneyAuditCsv} className="gap-2">
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
