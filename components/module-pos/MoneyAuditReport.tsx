import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  COMPANY_NAME,
  ReportDetailsStrip,
  ReportFigure,
  ReportPrintFrame,
  SignOff,
} from "@/components/module-pos/ReportPrint";
import { buildXlsx, type Cell, type Row } from "@/components/module-pos/xlsx";
import type { StartingCashRecord } from "@/pages/pos/ViewStartingCash";

export interface MoneyAuditMeta {
  periodLabel: string;
  branchLabel: string;
  preparedBy: string;
}

type ShiftStatus = "Balanced" | "Short" | "Over" | "Auto-closed" | "Not closed";

const STATUS_ORDER: ShiftStatus[] = ["Balanced", "Short", "Over", "Auto-closed", "Not closed"];

// Same rules as the Money Audit table's Status column.
export function shiftStatus(r: StartingCashRecord): ShiftStatus {
  if (r.autoClosed) return "Auto-closed";
  if (r.endShiftAmount == null) return "Not closed";
  if (r.cashVariance != null && r.cashVariance < 0) return "Short";
  if (r.cashVariance != null && r.cashVariance > 0) return "Over";
  return "Balanced";
}

const STATUS_COLOR: Record<ShiftStatus, string> = {
  Balanced: "var(--foreground)",
  Short: "var(--destructive)",
  Over: "var(--primary)",
  "Auto-closed": "#64748b",
  "Not closed": "#d97706",
};

const pesoFmt = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const peso = (n: number) => (n < 0 ? `(₱${pesoFmt.format(-n)})` : `₱${pesoFmt.format(n)}`);
const signedPeso = (n: number) => (n > 0 ? `+₱${pesoFmt.format(n)}` : peso(n));
const orDash = (n: number | null | undefined, fmt: (n: number) => string = peso) => (n == null ? "—" : fmt(n));

const businessDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

const sum = (records: StartingCashRecord[], pick: (r: StartingCashRecord) => number | null | undefined) =>
  records.reduce((t, r) => t + (pick(r) ?? 0), 0);

function totalsOf(records: StartingCashRecord[]) {
  const counted = records.filter((r) => r.endShiftAmount != null && !r.autoClosed);
  const byStatus = STATUS_ORDER.map((status) => {
    const rows = records.filter((r) => shiftStatus(r) === status);
    return { status, shifts: rows.length, variance: sum(rows, (r) => r.cashVariance) };
  });
  return {
    shifts: records.length,
    startingCash: sum(records, (r) => r.amount),
    sales: sum(records, (r) => r.successfulSalesAmount),
    refunds: sum(records, (r) => r.approvedRefundAmount),
    expected: sum(records, (r) => r.expectedCash),
    counted: sum(counted, (r) => r.endShiftAmount),
    netVariance: sum(counted, (r) => r.cashVariance),
    countedShifts: counted.length,
    byStatus,
  };
}

const TH = "px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap";
const TD = "px-3 py-2 text-sm align-top";
const NUM = "text-right tabular-nums whitespace-nowrap";
const TOTAL_ROW = "border-t-2 border-border bg-muted/30 font-semibold text-foreground";

function Section({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-2 break-after-avoid">
        <h2 className="text-base font-semibold text-foreground m-0">
          <span className="text-primary mr-2 tabular-nums">{number}.</span>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 m-0">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Printed Money Audit report, in the same template as the Sales Report. It only renders
 * on paper; the interactive Money Audit table stays on screen.
 */
export function MoneyAuditPrint({ records, meta }: { records: StartingCashRecord[]; meta: MoneyAuditMeta }) {
  const t = totalsOf(records);
  const generated = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  const multiBranch = new Set(records.map((r) => r.locationId)).size > 1;
  const varianceTone = t.netVariance < 0 ? "var(--destructive)" : t.netVariance > 0 ? "var(--primary)" : undefined;

  return (
    <ReportPrintFrame
      title="Money Audit Report"
      periodLabel={meta.periodLabel}
      branchLabel={meta.branchLabel}
      className="hidden print:table"
    >
      <div className="space-y-5">
        <ReportDetailsStrip
          items={[
            ["Branch", meta.branchLabel],
            ["Period", meta.periodLabel],
            ["Prepared by", meta.preparedBy || "—"],
            ["Generated", generated],
          ]}
        />

        {/* Same four-box row as the Sales Report's key figures. */}
        <div className="grid grid-cols-4 gap-3 break-inside-avoid">
          <ReportFigure label="Shifts" value={t.shifts.toLocaleString("en-PH")}>
            <p className="text-xs text-muted-foreground m-0">{t.countedShifts} counted at close</p>
          </ReportFigure>
          <ReportFigure label="Starting cash" value={peso(t.startingCash)}>
            <p className="text-xs text-muted-foreground m-0">Declared by cashiers</p>
          </ReportFigure>
          <ReportFigure label="Expected cash" value={peso(t.expected)}>
            <p className="text-xs text-muted-foreground m-0">Sales {peso(t.sales)} · Refunds {peso(t.refunds)}</p>
          </ReportFigure>
          <ReportFigure label="Net variance" value={t.countedShifts ? signedPeso(t.netVariance) : "—"} tone={varianceTone}>
            <p className="text-xs text-muted-foreground m-0">Counted less expected</p>
          </ReportFigure>
        </div>

        <Section number={1} title="Shift summary" subtitle="Shifts by how the end-of-shift count turned out">
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={TH}>Status</th>
                  <th className={cn(TH, "!text-right")}>Shifts</th>
                  <th className={cn(TH, "!text-right")}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {t.byStatus.map((s) => (
                  <tr key={s.status} className="border-b border-border">
                    <td className={TD}>
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />
                        {s.status}
                      </span>
                    </td>
                    <td className={cn(TD, NUM)}>{s.shifts}</td>
                    <td className={cn(TD, NUM)}>
                      {s.status === "Short" || s.status === "Over" ? (s.shifts ? signedPeso(s.variance) : peso(0)) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className={TOTAL_ROW}>
                  <td className={TD}>Total</td>
                  <td className={cn(TD, NUM)}>{t.shifts}</td>
                  <td className={cn(TD, NUM)}>{t.countedShifts ? signedPeso(t.netVariance) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section number={2} title="Shift details" subtitle="Each shift's declared starting cash, sales and closing count">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground m-0 py-6 text-center">No shifts in this period.</p>
          ) : (
            <div className="audit-details rounded-md border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className={TH}>Date</th>
                    <th className={TH}>Cashier</th>
                    {multiBranch && <th className={TH}>Branch</th>}
                    <th className={cn(TH, "!text-right")}>Starting</th>
                    <th className={cn(TH, "!text-right")}>Sales</th>
                    <th className={cn(TH, "!text-right")}>Refunds</th>
                    <th className={cn(TH, "!text-right")}>Expected</th>
                    <th className={cn(TH, "!text-right")}>Counted</th>
                    <th className={cn(TH, "!text-right")}>Variance</th>
                    <th className={TH}>Closed by</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const status = shiftStatus(r);
                    return (
                      <tr key={r.id} className="border-b border-border">
                        <td className={cn(TD, "whitespace-nowrap")}>
                          {businessDay(r.businessDate)}
                          <span className="block text-xs text-muted-foreground">{clock(r.createdAt)}</span>
                        </td>
                        <td className={TD}>{r.cashierName}</td>
                        {multiBranch && <td className={TD}>{r.locationName || `Branch ${r.locationId}`}</td>}
                        <td className={cn(TD, NUM)}>{peso(r.amount)}</td>
                        <td className={cn(TD, NUM)}>{orDash(r.successfulSalesAmount)}</td>
                        <td className={cn(TD, NUM)}>{orDash(r.approvedRefundAmount)}</td>
                        <td className={cn(TD, NUM)}>{orDash(r.expectedCash)}</td>
                        <td className={cn(TD, NUM)}>{r.autoClosed ? "Not counted" : orDash(r.endShiftAmount)}</td>
                        <td className={cn(TD, NUM)}>{r.autoClosed ? "—" : orDash(r.cashVariance, signedPeso)}</td>
                        <td className={TD}>{r.autoClosed ? "System (end of day)" : r.endShiftCashierName || "—"}</td>
                        <td className={cn(TD, "whitespace-nowrap font-semibold")} style={{ color: STATUS_COLOR[status] }}>
                          {status}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={TOTAL_ROW}>
                    <td className={TD} colSpan={multiBranch ? 3 : 2}>Total ({t.shifts} shifts)</td>
                    <td className={cn(TD, NUM)}>{peso(t.startingCash)}</td>
                    <td className={cn(TD, NUM)}>{peso(t.sales)}</td>
                    <td className={cn(TD, NUM)}>{peso(t.refunds)}</td>
                    <td className={cn(TD, NUM)}>{peso(t.expected)}</td>
                    <td className={cn(TD, NUM)}>{peso(t.counted)}</td>
                    <td className={cn(TD, NUM)}>{t.countedShifts ? signedPeso(t.netVariance) : "—"}</td>
                    <td className={TD} colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <section className="break-inside-avoid">
          <h2 className="text-base font-semibold text-foreground m-0 mb-2">Notes to the report</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground m-0">
            <li>All amounts are in Philippine pesos (₱).</li>
            <li>Expected cash is the shift&apos;s starting cash plus its sales, less approved refunds.</li>
            <li>Variance is the counted cash less the expected cash: negative is short, positive is over.</li>
            <li>
              Auto-closed shifts were not ended by a cashier and were closed by the system at the end of the business
              day; no cash was counted, so they have no variance.
            </li>
          </ol>
          <SignOff preparedBy={meta.preparedBy} />
        </section>
        {/* Eleven columns on portrait A4: slimmer cells than the shared report tables. */}
        <style>{`@media print { .audit-details table th { padding: 5px 5px !important; } .audit-details table td { padding: 4px 5px !important; font-size: 8pt !important; } }`}</style>
      </div>
    </ReportPrintFrame>
  );
}

/** Money Audit as an Excel workbook, in the same template as the Sales Report export. */
export function moneyAuditXlsx(records: StartingCashRecord[], meta: MoneyAuditMeta): Blob {
  const t = totalsOf(records);
  const rows: Row[] = [];
  const blank = () => rows.push([]);
  const money = (v: number | null | undefined): Cell => (v == null ? null : { v, s: "money" });
  const header = (...labels: string[]): Row => labels.map((v) => ({ v, s: "header" as const }));
  const section = (title: string, width: number) => rows.push([{ v: title, s: "section", span: width }]);
  const detail = (label: string, value: string) => rows.push([{ v: label, s: "label" }, { v: value, s: "meta", span: 2 }]);

  rows.push([{ v: `${COMPANY_NAME} — Money Audit Report`, s: "title" }]);
  detail("Period", meta.periodLabel);
  detail("Branch", meta.branchLabel);
  detail("Prepared by", meta.preparedBy || "—");
  detail("Generated", new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }));
  blank();

  section("Shift summary", 3);
  rows.push(header("Status", "Shifts", "Variance"));
  t.byStatus.forEach((s) =>
    rows.push([s.status, s.shifts, s.status === "Short" || s.status === "Over" ? money(s.variance) : null])
  );
  rows.push([
    { v: "Total", s: "totalLabel" },
    { v: t.shifts, s: "totalCount" },
    { v: t.countedShifts ? t.netVariance : null, s: "totalMoney" },
  ]);
  blank();

  section("Shift details", 12);
  rows.push(header("Date", "Started", "Cashier", "Branch", "Starting cash", "Sales", "Refunds", "Expected cash", "Counted cash", "Variance", "Closed by", "Status"));
  records.forEach((r) =>
    rows.push([
      // Real dates so the column sorts and filters as dates.
      { v: new Date(`${r.businessDate}T00:00:00Z`), s: "date" },
      clock(r.createdAt),
      r.cashierName,
      r.locationName || `Branch ${r.locationId}`,
      money(r.amount),
      money(r.successfulSalesAmount),
      money(r.approvedRefundAmount),
      money(r.expectedCash),
      r.autoClosed ? "Not counted" : money(r.endShiftAmount),
      r.autoClosed ? null : money(r.cashVariance),
      r.autoClosed ? "System (end of day)" : r.endShiftCashierName || null,
      shiftStatus(r),
    ])
  );
  rows.push([
    { v: `Total (${t.shifts} shifts)`, s: "totalLabel" },
    { v: "", s: "totalLabel" },
    { v: "", s: "totalLabel" },
    { v: "", s: "totalLabel" },
    { v: t.startingCash, s: "totalMoney" },
    { v: t.sales, s: "totalMoney" },
    { v: t.refunds, s: "totalMoney" },
    { v: t.expected, s: "totalMoney" },
    { v: t.counted, s: "totalMoney" },
    { v: t.countedShifts ? t.netVariance : null, s: "totalMoney" },
    { v: "", s: "totalLabel" },
    { v: "", s: "totalLabel" },
  ]);
  blank();

  section("Notes", 12);
  [
    "Amounts in Philippine pesos; amounts in parentheses are negative.",
    "Expected cash is the shift's starting cash plus its sales, less approved refunds.",
    "Variance is the counted cash less the expected cash: negative is short, positive is over.",
    "Auto-closed shifts were closed by the system at the end of the business day; no cash was counted.",
  ].forEach((n, i) => rows.push([{ v: `${i + 1}. ${n}`, s: "note" }]));

  return buildXlsx("Money Audit", rows);
}
