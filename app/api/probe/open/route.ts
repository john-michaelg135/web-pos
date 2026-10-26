import { NextResponse, type NextRequest } from "next/server";
import { accessFor } from "@/lib/portal/access";
import { LOGIN_PATH, NO_ACCESS_PATH, SESSION_COOKIE, UNAVAILABLE_PATH } from "@/lib/portal/config";
import { probeUrl, signProbeHandoff } from "@/lib/portal/probe-handoff";
import { probeRoleFor } from "@/lib/portal/roles";

export const dynamic = "force-dynamic";

const RETURN_TO = "/sales-processing";

/**
 * "Open Probe": re-checks the Staff member with the Enterprise Portal, then sends the browser
 * to POS-PROBE with a signed pass. Only the owner (Super Admin, CEO) and POS Managers get one.
 */
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const found = await accessFor(request.cookies.get(SESSION_COOKIE)?.value).role();

  if (found.decision === "invalid") return to(`${LOGIN_PATH}?returnTo=${encodeURIComponent(RETURN_TO)}`);
  if (found.decision === "unavailable") return to(`${UNAVAILABLE_PATH}?returnTo=${encodeURIComponent(RETURN_TO)}`);
  if (found.decision !== "allowed") return to(NO_ACCESS_PATH);

  const role = probeRoleFor(found.role);

  if (!role) return to(NO_ACCESS_PATH);

  const handoff = new URL(`${probeUrl()}/api/auth/handoff`);
  handoff.searchParams.set("token", signProbeHandoff(found.staff, role));

  return NextResponse.redirect(handoff);
}
