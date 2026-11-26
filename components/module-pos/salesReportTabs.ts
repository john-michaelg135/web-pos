"use client";

import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { isManager, seesOnlineSales } from "@/lib/portal/roles";

export type ReportTab = "analytics" | "money-audit" | "online";

/**
 * The Sales Report tabs the signed-in Staff member gets, in order. The page and its loading skeleton both use it,
 * so the skeleton never shows a tab the page won't (or leaves one out).
 */
export function useSalesReportTabs() {
  const { user, can } = useAuth();
  const canMoneyAudit = !!user && (user.isSuperUser || isManager(user.role) || can(POS_MODULES.ORDER_MANAGEMENT, "approve"));
  // Online storefront sales are company-wide: the General Manager and the Owner see them, branch Managers don't.
  const canOnlineSales = seesOnlineSales(user?.role);
  const tabs: { value: ReportTab; label: string }[] = [
    { value: "analytics", label: "Sales Report" },
    ...(canMoneyAudit ? [{ value: "money-audit" as const, label: "Money Audit" }] : []),
    ...(canOnlineSales ? [{ value: "online" as const, label: "Online Sales" }] : []),
  ];
  return { tabs, canMoneyAudit, canOnlineSales };
}
