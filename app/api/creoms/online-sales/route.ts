import { NextResponse, type NextRequest } from "next/server";

import { readOnlineSales } from "@/lib/creoms/online-sales";
import { accessFor } from "@/lib/portal/access";
import { SESSION_COOKIE } from "@/lib/portal/config";
import { roleMayUseModule } from "@/lib/portal/modules";
import { isSuperUser } from "@/lib/portal/roles";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const SALES_REPORTS = "Sales Reports";

/** Online storefront Sales from CREOMS, for Staff who may open Sales Reports (Admin and CEO always may). */
export async function GET(request: NextRequest) {
  const access = accessFor(request.cookies.get(SESSION_COOKIE)?.value);
  const asked = await access.check(SALES_REPORTS);
  let allowed = asked.decision === "allowed" && roleMayUseModule(asked.staff.role, SALES_REPORTS);
  if (!allowed && asked.decision !== "invalid" && asked.decision !== "unavailable") {
    const known = await access.role();
    allowed = known.decision === "allowed" && isSuperUser(known.role);
  }
  if (!allowed) {
    const status = asked.decision === "invalid" ? 401 : asked.decision === "unavailable" ? 503 : 403;
    return NextResponse.json({ message: "You can't view online sales." }, { status, headers: NO_STORE });
  }

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const result = await readOnlineSales(from, to);
  if (result.ok) return NextResponse.json(result.data, { headers: NO_STORE });
  return result.reason === "range"
    ? NextResponse.json({ message: "Pick a period of at most a year." }, { status: 400, headers: NO_STORE })
    : NextResponse.json({ message: "Online sales are unavailable right now." }, { status: 503, headers: NO_STORE });
}
