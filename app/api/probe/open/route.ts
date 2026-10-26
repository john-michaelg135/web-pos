import { NextResponse, type NextRequest } from "next/server";
import { accessFor } from "@/lib/portal/access";
import { proxyApiPos } from "@/lib/portal/api-pos-proxy";
import { LOGIN_PATH, NO_ACCESS_PATH, SESSION_COOKIE, UNAVAILABLE_PATH } from "@/lib/portal/config";
import { probeUrl, signProbeHandoff, type ProbeLocation } from "@/lib/portal/probe-handoff";
import { probeRoleFor } from "@/lib/portal/roles";

export const dynamic = "force-dynamic";

const RETURN_TO = "/sales-processing";

type AssignedLocation = { locationId: number; locationName: string; isPrimary: boolean };

/** The manager's branch from api-pos (primary first), or undefined if api-pos couldn't say. */
async function assignedLocation(request: NextRequest): Promise<ProbeLocation | undefined> {
  const response = await proxyApiPos(request, "/api-pos/locations/mine", "GET");
  if (!response.ok) return undefined;

  const body = (await response.json().catch(() => null)) as { locations?: AssignedLocation[] } | null;
  const locations = Array.isArray(body?.locations) ? body.locations : [];
  const chosen = locations.find((l) => l.isPrimary) ?? locations[0];

  return chosen ? { id: chosen.locationId, name: chosen.locationName } : null;
}

/**
 * "Open Probe": re-checks the Staff member with the Enterprise Portal, then sends the browser
 * to POS-PROBE with a signed pass. Only the owner (Super Admin, CEO) and POS Managers get one;
 * a manager's pass carries the branch they're assigned to.
 */
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const found = await accessFor(request.cookies.get(SESSION_COOKIE)?.value).role();

  if (found.decision === "invalid") return to(`${LOGIN_PATH}?returnTo=${encodeURIComponent(RETURN_TO)}`);
  if (found.decision === "unavailable") return to(`${UNAVAILABLE_PATH}?returnTo=${encodeURIComponent(RETURN_TO)}`);
  if (found.decision !== "allowed") return to(NO_ACCESS_PATH);

  const role = probeRoleFor(found.role);

  if (!role) return to(NO_ACCESS_PATH);

  // A manager only sees their own branch's data in POS-PROBE; the owner sees every location.
  let location: ProbeLocation = null;

  if (role === "manager") {
    const assigned = await assignedLocation(request);

    if (assigned === undefined) return to(`${UNAVAILABLE_PATH}?returnTo=${encodeURIComponent(RETURN_TO)}`);
    if (assigned === null) return NextResponse.redirect(new URL(`${probeUrl()}/signin?reason=unassigned`));

    location = assigned;
  }

  const handoff = new URL(`${probeUrl()}/api/auth/handoff`);
  handoff.searchParams.set("token", signProbeHandoff(found.staff, role, location));

  return NextResponse.redirect(handoff);
}
