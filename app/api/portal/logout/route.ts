import { NextResponse } from "next/server";
import { SESSION_COOKIE, portalConfig } from "@/lib/portal/config";

export const dynamic = "force-dynamic";

/**
 * Sends the browser to the Enterprise Portal's logout, which ends the one central session for
 * every System in this browser. POST so a link or image cannot sign someone out.
 */
export function POST() {
  const response = NextResponse.redirect(portalConfig().logoutUrl, 303);
  response.cookies.delete(SESSION_COOKIE);

  return response;
}
