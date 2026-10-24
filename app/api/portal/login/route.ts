import { NextResponse, type NextRequest } from "next/server";
import { HANDOFF_COOKIE, CALLBACK_PATH, portalConfig } from "@/lib/portal/config";
import { challengeFor, newState, newVerifier } from "@/lib/portal/pkce";
import { safeReturnTo } from "@/lib/portal/return-to";

export const dynamic = "force-dynamic";

/** Starts the handoff: remembers the page asked for and sends the browser to the Enterprise Portal. */
export function GET(request: NextRequest) {
  const { portalUrl, systemName, callbackUrl } = portalConfig();
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const state = newState();
  const verifier = newVerifier();

  const authorize = new URL(`${portalUrl}/api/integrations/authorize`);
  authorize.searchParams.set("system", systemName);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challengeFor(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(HANDOFF_COOKIE, JSON.stringify({ state, verifier, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: CALLBACK_PATH,
    maxAge: 600,
  });

  return response;
}
