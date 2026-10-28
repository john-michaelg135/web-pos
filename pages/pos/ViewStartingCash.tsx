"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Loader2, Plus, RefreshCw } from "lucide-react";
import { apiClient } from "@/components/module-pos/api";
import { useAuth } from "@/context/AuthContext";
import { useMyLocations } from "@/lib/useMyLocations";
import { isManager as isManagerRole } from "@/lib/portal/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { MONEY_AUDIT_COLUMNS, MoneyAuditSkeleton, SkeletonRows } from "@/components/shared/PageSkeleton";

export interface StartingCashRecord {
  id: number;
  cashierName: string;
  locationId: number;
  locationName?: string | null;
  businessDate: string;
  amount: number;
  createdAt: string;
  endShiftAmount?: number | null;
  endShiftAt?: string | null;
  endShiftCashierName?: string | null;
  successfulSalesAmount?: number | null;
  approvedRefundAmount?: number | null;
  expectedCash?: number | null;
  cashVariance?: number | null;
  cashShortage?: number | null;
  /** Closed by the system at the end of the business day because no cashier ended the shift. */
  autoClosed?: boolean;
}

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface ViewStartingCashProps {
  embedded?: boolean;
  locationId?: number;
  dateFrom?: string;
  dateTo?: string;
  onRecordsChange?: (records: StartingCashRecord[]) => void;
}

/** Manager-only: every cashier's declared starting cash. */
export function ViewStartingCash({
  embedded = false,
  locationId,
  dateFrom: propDateFrom,
  dateTo: propDateTo,
  onRecordsChange,
}: ViewStartingCashProps = {}) {
  const headers = {};
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { scope: locScope, locations: myLocations } = useMyLocations();
  const router = useRouter();

  const hasAccess = !!authUser && (authUser.isSuperUser || isManagerRole(authUser.role));

  // Determine effective location: managers are pinned to their assigned branch
  const assignedLocationId = locScope === "assigned" && myLocations.length > 0 ? myLocations[0].locationId : undefined;
  const effectiveLocationId = !authUser?.isSuperUser ? (assignedLocationId ?? locationId) : locationId;

  const [records, setRecords] = useState<StartingCashRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalDateFrom, setInternalDateFrom] = useState("");
  const [internalDateTo, setInternalDateTo] = useState("");
  const [search, setSearch] = useState("");

  const activeDateFrom = propDateFrom !== undefined ? propDateFrom : internalDateFrom;
  const activeDateTo = propDateTo !== undefined ? propDateTo : internalDateTo;

  // "Add starting cash" modal state for managers
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalAmount, setModalAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchLocations, setBranchLocations] = useState<{ locationId: number; locationName: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  useEffect(() => {
    if (!embedded && !authLoading && !hasAccess) router.replace("/no-access");
  }, [embedded, authLoading, hasAccess, router]);

  // Sync selectedBranchId if effectiveLocationId is resolved
  useEffect(() => {
    if (effectiveLocationId) {
      setSelectedBranchId(effectiveLocationId);
    }
  }, [effectiveLocationId]);

  // Load available locations for the manager
  useEffect(() => {
    let isMounted = true;
    apiClient.apiPos
      .locationsList()
      .then(({ data }) => {
        if (!isMounted || !Array.isArray(data)) return;
        const list = data.map((l: any) => ({
          locationId: Number(l.locationId),
          locationName: l.locationName || `Branch ${l.locationId}`,
        }));
        const filteredList = !authUser?.isSuperUser && effectiveLocationId
          ? list.filter((b) => b.locationId === effectiveLocationId)
          : list;
        setBranchLocations(filteredList);
        if (filteredList.length > 0) {
          const userLoc = filteredList.find((b) => b.locationId === effectiveLocationId);
          setSelectedBranchId(userLoc ? userLoc.locationId : filteredList[0].locationId);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [authUser?.isSuperUser, effectiveLocationId]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeDateFrom) params.from = activeDateFrom;
      if (activeDateTo) params.to = activeDateTo;
      if (effectiveLocationId) params.locationId = String(effectiveLocationId);
      const res = await apiClient.instance.get("/api-pos/starting-cash", { headers, params });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.warn("Failed to load starting cash records:", err?.message || "Unknown error");
      const data = err?.response?.data;
      toast.error(typeof data === "string" && data ? data : data?.message || "Failed to load starting cash records.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDateFrom, activeDateTo, effectiveLocationId]);

  useEffect(() => {
    if (hasAccess) fetchRecords();
  }, [hasAccess, fetchRecords]);

  // Determine if starting cash was already declared for this shift (today UTC+8)
  const todayIso = useMemo(() => {
    const d = new Date();
    const utc8 = new Date(d.getTime() + (d.getTimezoneOffset() + 480) * 60000);
    return utc8.toISOString().slice(0, 10);
  }, []);

  const hasDeclaredForShift = useMemo(() => {
    const locIdToCheck = effectiveLocationId || selectedBranchId;
    if (!locIdToCheck) {
      return records.some((r) => r.businessDate === todayIso);
    }
    return records.some(
      (r) => r.businessDate === todayIso && r.locationId === locIdToCheck
    );
  }, [records, selectedBranchId, effectiveLocationId, todayIso]);

  const handleAddStartingCash = async () => {
    const value = parseFloat(modalAmount);
    if (isNaN(value) || value < 0) {
      toast.error("Enter a valid starting cash amount (0 or more).");
      return;
    }
    const targetLoc = effectiveLocationId || selectedBranchId || branchLocations[0]?.locationId;
    if (!targetLoc) {
      toast.error("Please select a branch.");
      return;
    }
    setIsSubmitting(true);
    try {
      const managerName = authUser?.username || "Manager";
      await apiClient.instance.post(
        "/api-pos/starting-cash",
        {
          locationId: targetLoc,
          amount: value,
          cashierName: managerName,
        },
        { headers }
      );
      toast.success(`Starting cash of ${peso(value)} recorded.`);
      setShowAddModal(false);
      setModalAmount("");
      await fetchRecords();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = typeof data === "string" && data ? data : data?.message || "Failed to record starting cash.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visible = useMemo(() => {
    let list = records;
    if (!authUser?.isSuperUser && effectiveLocationId) {
      list = list.filter((r) => r.locationId === effectiveLocationId);
    }
    const q = (search || "").toLowerCase().trim();
    if (!q) return list;
    return list.filter((r) => {
      const cashier = (r.cashierName || "").toLowerCase();
      const location = (r.locationName || "").toLowerCase();
      const date = (r.businessDate || "").toLowerCase();
      const amount = String(r.amount);
      return cashier.includes(q) || location.includes(q) || date.includes(q) || amount.includes(q);
    });
  }, [records, search, authUser?.isSuperUser, effectiveLocationId]);

  useEffect(() => {
    onRecordsChange?.(visible);
  }, [visible, onRecordsChange]);

  const total = useMemo(() => visible.reduce((sum, r) => sum + r.amount, 0), [visible]);

  if (authLoading) {
    if (embedded) return <MoneyAuditSkeleton />;
    return (
      <div className="w-full py-8 px-6 md:px-8 space-y-6">
        <div>
          <h2 className="font-bold tracking-tight text-foreground text-headline-md">Starting Cash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The drawer cash each cashier declared before selling. Visible to managers only.
          </p>
        </div>
        <MoneyAuditSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    if (embedded) {
      return (
        <div className="p-8 text-center text-muted-foreground text-sm">
          You do not have permission to view starting cash records.
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn(
      embedded ? "w-full space-y-6" : "w-full py-8 px-6 md:px-8 space-y-6 animate-page-in"
    )}>
      {!embedded && (
        <div>
          <h2 className="font-bold tracking-tight text-foreground text-headline-md">
            Starting Cash
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The drawer cash each cashier declared before selling. Visible to managers only.
          </p>
        </div>
      )}

      {/* KPI Cards & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-72 p-5 bg-card border border-border rounded-xl shadow-none flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Declarations</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{visible.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
          </div>

          <div className="w-full sm:w-72 p-5 bg-card border border-border rounded-xl shadow-none flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Starting Cash</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-primary">{peso(total)}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <Button variant="outline" size="sm" className="rounded-lg gap-2" onClick={fetchRecords} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {!hasDeclaredForShift && (
            <Button
              size="sm"
              className="rounded-lg gap-1.5"
              onClick={() => {
                setModalAmount("");
                setShowAddModal(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add starting cash
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="print:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by cashier or branch…"
          maxLength={50}
          className="w-full sm:max-w-[280px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Records Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-none print:border print:border-gray-300 print:rounded-lg print:overflow-hidden print:bg-white print:mt-4 print:shadow-none">
        <div className="overflow-x-auto print:overflow-hidden">
          <table className="w-full min-w-[900px] text-sm print:min-w-0 print:text-xs print:border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground print:bg-gray-100 print:border-b-2 print:border-gray-300 print:text-gray-700">
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Date &amp; Time</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Cashier</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Branch</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Cash Summary</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Closed By</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Closing Summary</th>
                <th className="px-5 py-3.5 text-left font-bold print:px-2 print:py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={MONEY_AUDIT_COLUMNS} rows={5} cellClassName="px-5 py-3.5" />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground print:py-8 print:text-gray-500">
                    No starting cash records found.
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors print:border-b print:border-gray-200 print:hover:bg-transparent">
                    <td className="px-5 py-3.5 font-medium text-foreground print:px-2 print:py-2 print:text-gray-900">
                      <div>{new Date(`${r.businessDate}T00:00:00`).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</div>
                      <div className="mt-1 text-xs font-normal text-muted-foreground">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground print:px-2 print:py-2">{r.cashierName}</td>
                    <td className="max-w-[220px] px-5 py-3.5 text-muted-foreground print:px-2 print:py-2 print:text-gray-700">
                      {r.locationName || `Branch ${r.locationId}`}
                    </td>
                    <td className="px-5 py-3.5 print:px-2 print:py-2">
                      <div className="space-y-1.5">
                        <div><span className="text-muted-foreground">Starting:</span> <span className="font-semibold text-foreground">{peso(r.amount)}</span></div>
                        <div><span className="text-muted-foreground">Sales:</span> <span className="text-foreground">{r.successfulSalesAmount == null ? "—" : peso(r.successfulSalesAmount)}</span></div>
                        <div><span className="text-muted-foreground">Refunds:</span> <span className="text-foreground">{r.approvedRefundAmount == null ? "—" : peso(r.approvedRefundAmount)}</span></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground print:px-2 print:py-2">
                      {r.autoClosed ? (
                        <span className="text-muted-foreground">System (end of day)</span>
                      ) : (
                        r.endShiftCashierName || "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 print:px-2 print:py-2">
                      <div className="space-y-1.5">
                        <div><span className="text-muted-foreground">End:</span> <span className="font-semibold text-foreground">{r.endShiftAmount != null ? peso(r.endShiftAmount) : r.autoClosed ? <span className="font-normal text-muted-foreground">Not counted</span> : "—"}</span></div>
                        <div><span className="text-muted-foreground">Expected:</span> <span className="text-foreground">{r.expectedCash == null ? "—" : peso(r.expectedCash)}</span></div>
                        <div>
                          <span className="text-muted-foreground">Variance:</span>{" "}
                          <span className={cn(
                            "font-medium",
                            r.cashVariance == null ? "text-muted-foreground" : r.cashVariance < 0 ? "text-destructive" : r.cashVariance > 0 ? "text-primary" : "text-foreground"
                          )}>
                            {r.cashVariance == null
                              ? "—"
                              : `${r.cashVariance > 0 ? "+" : ""}${peso(r.cashVariance)}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 print:px-2 print:py-2">
                      {r.autoClosed ? (
                        <span
                          className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300"
                          title="No cashier ended this shift, so it was closed automatically at the end of the day."
                        >
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          Auto-closed
                        </span>
                      ) : r.endShiftAmount == null ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          Not Closed
                        </span>
                      ) : r.cashVariance != null && r.cashVariance < 0 ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-destructive">
                          <span className="h-2 w-2 rounded-full bg-destructive" />
                          Short {peso(r.cashShortage ?? Math.abs(r.cashVariance))}
                        </span>
                      ) : r.cashVariance != null && r.cashVariance > 0 ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-primary">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          Over {peso(r.cashVariance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-foreground">
                          <span className="h-2 w-2 rounded-full bg-foreground" />
                          Balanced
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Starting Cash Modal for Manager */}
      {showAddModal &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              onClick={() => !isSubmitting && setShowAddModal(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99998,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
              }}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 99999,
                width: "90%",
                maxWidth: 480,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e4e4e7",
                  flexShrink: 0,
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
                  Add Starting Cash
                </h2>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#71717a", lineHeight: 1.5 }}>
                  Declare the drawer starting cash for this branch shift. Once saved, it will be tracked for the shift.
                </p>

                {branchLocations.length > 1 && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#71717a",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Branch
                    </label>
                    <select
                      value={selectedBranchId ?? ""}
                      onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e4e4e7",
                        backgroundColor: "#ffffff",
                        fontSize: 14,
                        color: "#18181b",
                        outline: "none",
                      }}
                    >
                      {branchLocations.map((b) => (
                        <option key={b.locationId} value={b.locationId}>
                          {b.locationName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 6,
                    }}
                  >
                    Starting Cash (₱) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={modalAmount}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      const [whole, ...rest] = cleaned.split(".");
                      setModalAmount(rest.length === 0 ? whole : `${whole}.${rest.join("").slice(0, 2)}`);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleAddStartingCash()}
                    placeholder="e.g. 2000.00"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #e4e4e7",
                      backgroundColor: "#ffffff",
                      fontSize: 14,
                      color: "#18181b",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "12px 24px",
                  borderTop: "1px solid #e4e4e7",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  backgroundColor: "#fafafa",
                  borderRadius: "0 0 12px 12px",
                  flexShrink: 0,
                }}
              >
                <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStartingCash}
                  disabled={isSubmitting || modalAmount === "" || modalAmount === "."}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export default ViewStartingCash;
