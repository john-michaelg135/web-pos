import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

const AUTH_ISSUER = process.env.AUTH_ISSUER ?? "";

async function isAuthServiceReachable(): Promise<boolean> {
  if (!AUTH_ISSUER) return false;

  try {
    const discoveryUrl = `${AUTH_ISSUER}.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isCallbackOrSignin =
    pathname.includes("/callback") || pathname.includes("/signin");

  if (isCallbackOrSignin) {
    const reachable = await isAuthServiceReachable();
    if (!reachable) {
      return NextResponse.redirect(
        new URL("/auth-unavailable", request.nextUrl.origin)
      );
    }
  }

  try {
    return await handlers.GET(request);
  } catch (error) {
    console.error("[NextAuth] GET handler error:", error);
    return NextResponse.redirect(
      new URL("/auth-unavailable", request.nextUrl.origin)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error) {
    console.error("[NextAuth] POST handler error:", error);
    return NextResponse.redirect(
      new URL("/auth-unavailable", request.nextUrl.origin)
    );
  }
}
