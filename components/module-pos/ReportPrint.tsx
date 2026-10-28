import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export const COMPANY_NAME = "Bren Raphael's";

/** Running header printed at the top of every page: enterprise logo, POS badge, report title. */
function PrintHeader({ title, periodLabel, branchLabel }: { title: string; periodLabel: string; branchLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-6 pb-3 mb-5 border-b-2 border-primary">
      <div className="flex items-center gap-3">
        <Image
          src="/images/bren-raphaels-logo.svg"
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 rounded-[9px]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold text-zinc-900 leading-none">{COMPANY_NAME}</span>
          <span className="text-[10px] font-semibold bg-[#f3e8ff] text-[#6d28d9] px-2 py-[2px] rounded-md w-fit">
            Point of Sale
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-foreground m-0 leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground m-0 mt-0.5">{periodLabel}</p>
        <p className="text-xs text-muted-foreground m-0">{branchLabel}</p>
      </div>
    </div>
  );
}

/**
 * A4 page setup for a printed report. The page footer comes from @page margin boxes,
 * which replace the browser's own date/URL header and footer where supported.
 */
const printCss = (title: string, orientation: "portrait" | "landscape") => `
@media print {
  @page {
    size: A4 ${orientation};
    margin: 12mm 12mm 14mm;
    @bottom-left {
      content: "${COMPANY_NAME} \\00B7 ${title} \\00B7 For internal use";
      font-family: Inter, system-ui, sans-serif;
      font-size: 7.5pt;
      color: #71717a;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: Inter, system-ui, sans-serif;
      font-size: 7.5pt;
      color: #71717a;
    }
  }
  html, body { background: #fff !important; }
  .report-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-print tr { break-inside: avoid; }
  .report-print table th { padding: 6px 8px !important; font-size: 7pt !important; }
  .report-print table td { padding: 5px 8px !important; font-size: 8.5pt !important; }
}
`;

/**
 * Shared template for printed POS reports. On paper the report is a CSS table, so the
 * header group (logo, POS badge, title, period, branch) repeats at the top of every page.
 * On screen it is a plain wrapper around the children.
 */
export function ReportPrintFrame({
  title,
  periodLabel,
  branchLabel,
  orientation = "portrait",
  className,
  children,
}: {
  title: string;
  periodLabel: string;
  branchLabel: string;
  orientation?: "portrait" | "landscape";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("report-print print:table print:w-full", className)}>
      <style dangerouslySetInnerHTML={{ __html: printCss(title, orientation) }} />

      <div className="hidden print:table-header-group">
        <div className="print:table-row">
          <div className="print:table-cell">
            <PrintHeader title={title} periodLabel={periodLabel} branchLabel={branchLabel} />
          </div>
        </div>
      </div>

      <div className="print:table-row-group">
        <div className="print:table-row">
          <div className="print:table-cell">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Report details strip (Branch, Compared with, Prepared by, …) as shown under the header. */
export function ReportDetails({ items, className }: { items: [string, string][]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm m-0", className)}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="m-0 mt-0.5 font-medium text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Print-only details strip shown once under the running header on page 1. Every report
 * uses this same box (four slots) so the templates line up exactly.
 */
export function ReportDetailsStrip({ items }: { items: [string, string][] }) {
  return (
    <div className="hidden print:block rounded-md border border-border bg-muted/30 p-3 break-inside-avoid">
      <ReportDetails className="grid-cols-4" items={items} />
    </div>
  );
}

/** Key figure box for printed reports; `children` is an optional line under the value. */
export function ReportFigure({ label, value, tone, children }: {
  label: string;
  value: string;
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 min-w-0 print:p-3 print:rounded-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground m-0">{label}</p>
      <p
        className="text-2xl font-bold tabular-nums mt-2 mb-1 truncate print:text-lg print:mt-1"
        style={{ color: tone ?? "var(--foreground)" }}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

/** Prepared / Reviewed / Approved signature lines. */
export function SignOff({ preparedBy }: { preparedBy: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10 print:grid-cols-3">
      {[
        ["Prepared by", preparedBy],
        ["Reviewed by", ""],
        ["Approved by", ""],
      ].map(([role, name]) => (
        <div key={role}>
          <div className="h-8 border-b border-foreground/40 flex items-end pb-1 text-sm font-medium text-foreground">{name}</div>
          <p className="text-xs text-muted-foreground mt-1.5 m-0">{role}</p>
        </div>
      ))}
    </div>
  );
}
