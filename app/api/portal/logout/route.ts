import { NextResponse } from "next/server";
import { devBypassEnabled } from "@/lib/portal/dev-bypass";
import { SESSION_COOKIE, portalConfig } from "@/lib/portal/config";

export const dynamic = "force-dynamic";

/**
 * Sends the browser to the Enterprise Portal's logout, which ends the one central session for
 * every System in this browser. POST so a link or image cannot sign someone out.
 */
export function POST() {
  // With the dev bypass there is no Enterprise Portal session to end.
  const response = devBypassEnabled()
    ? new NextResponse(null, { status: 303, headers: { location: "/" } })
    : NextResponse.redirect(portalConfig().logoutUrl, 303);
  response.cookies.delete(SESSION_COOKIE);

  return response;
}
