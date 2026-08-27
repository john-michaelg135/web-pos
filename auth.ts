import NextAuth from "next-auth";

// Module-level cache for in-flight token refresh promises.
const refreshCache = new Map<string, { promise: Promise<any>; expiresAt: number }>();

const REFRESH_CACHE_TTL_MS = 30_000;
const TOKEN_REFRESH_TIMEOUT_MS = 10_000;

async function refreshAccessToken(token: any) {
  const refreshToken = token.refreshToken as string;

  if (!refreshToken) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const cached = refreshCache.get(refreshToken);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.promise;
  }

  const refreshPromise = doRefreshAccessToken(token);
  refreshCache.set(refreshToken, {
    promise: refreshPromise,
    expiresAt: Date.now() + REFRESH_CACHE_TTL_MS,
  });

  refreshPromise.finally(() => {
    setTimeout(() => {
      const entry = refreshCache.get(refreshToken);
      if (entry && entry.promise === refreshPromise) {
        refreshCache.delete(refreshToken);
      }
    }, REFRESH_CACHE_TTL_MS);
  });

  return refreshPromise;
}

async function doRefreshAccessToken(token: any) {
  try {
    const url = `${process.env.AUTH_ISSUER}connect/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AUTH_POS_CLIENT_ID!,
        client_secret: process.env.AUTH_POS_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
      signal: AbortSignal.timeout(TOKEN_REFRESH_TIMEOUT_MS),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("[auth] Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Cached auth service health check (15-second TTL)
let authHealthCache: { healthy: boolean; checkedAt: number } | null = null;
const AUTH_HEALTH_CACHE_TTL_MS = 15_000;

async function isAuthServiceHealthy(): Promise<boolean> {
  if (authHealthCache && Date.now() - authHealthCache.checkedAt < AUTH_HEALTH_CACHE_TTL_MS) {
    return authHealthCache.healthy;
  }

  const issuer = process.env.AUTH_ISSUER;
  if (!issuer) {
    authHealthCache = { healthy: false, checkedAt: Date.now() };
    return false;
  }

  try {
    const discoveryUrl = `${issuer}.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    const healthy = response.ok;
    authHealthCache = { healthy, checkedAt: Date.now() };
    return healthy;
  } catch {
    authHealthCache = { healthy: false, checkedAt: Date.now() };
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "authservice",
      name: "Auth Service",
      type: "oidc",
      issuer: process.env.AUTH_ISSUER,
      clientId: process.env.AUTH_POS_CLIENT_ID,
      clientSecret: process.env.AUTH_POS_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email systems offline_access",
        },
      },
    },
  ],
  pages: {
    signIn: "/signin",
    error: "/auth-unavailable",
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      // On initial sign-in, populate token from account
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.error = undefined;
      }

      // Extract user profile claims
      if (profile) {
        if (profile.systems) {
          token.systems = (profile.systems as string).split(",");
        }
        if (profile.role) {
          token.role = profile.role as string;
        }
        if (profile.isSuperUser) {
          token.isSuperUser = profile.isSuperUser === "true" || profile.isSuperUser === true;
        }
        if (profile.permissions) {
          try {
            const allPerms = typeof profile.permissions === "string"
              ? JSON.parse(profile.permissions)
              : profile.permissions;
            token.permissions = { POS: allPerms?.POS || {} };
          } catch {
            token.permissions = {};
          }
        }
      }

      if (!token.expiresAt) return token;

      // Return previous token if access token has not expired yet (5 min buffer)
      if (Date.now() < ((token.expiresAt as number) - 300) * 1000) {
        return token;
      }

      // Access token expired, try to refresh
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }

      return { ...token, error: "RefreshAccessTokenError" };
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.systems = (token.systems as string[]) ?? [];
      session.role = (token.role as string) ?? "Staff/Employee";
      session.isSuperUser = (token.isSuperUser as boolean) ?? false;
      session.permissions = token.permissions ?? {};

      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.error) {
        session.error = token.error as string;
      }

      return session;
    },

    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthPath = pathname.startsWith("/api/auth");
      const isSignInPage = pathname === "/signin";
      const isAccessDeniedPage = pathname === "/access-denied";
      const isAuthUnavailablePage = pathname === "/auth-unavailable";

      // Always allow auth routes and error pages
      if (isAuthPath || isAuthUnavailablePage) {
        return true;
      }

      // For page navigations, verify auth service is reachable
      const isPageRequest = !pathname.startsWith("/api/");
      if (isPageRequest && !isSignInPage && !isAccessDeniedPage) {
        const reachable = await isAuthServiceHealthy();
        if (!reachable) {
          return Response.redirect(new URL("/auth-unavailable", request.nextUrl));
        }
      }

      // Authenticated users
      if (auth?.user) {
        // If token refresh failed, force re-authentication
        if (auth.error === "RefreshAccessTokenError") {
          if (isSignInPage || isAuthUnavailablePage) return true;
          return false;
        }

        // Super users bypass all permission checks
        if (auth.isSuperUser) {
          if (isSignInPage || isAccessDeniedPage) {
            return Response.redirect(new URL("/", request.nextUrl));
          }
          return true;
        }

        // Enforce system permission — user must have POS access
        // (Disabled: all authenticated users can access POS)
        // const systems = (auth.systems || []).map((s: string) => s.toUpperCase());
        // const hasPosAccess = systems.includes("POS");
        // if (!hasPosAccess) {
        //   if (isAccessDeniedPage) return true;
        //   return Response.redirect(new URL("/access-denied", request.nextUrl));
        // }

        // Authenticated user — redirect away from signin
        if (isSignInPage) {
          return Response.redirect(new URL("/", request.nextUrl));
        }

        return true;
      }

      // Unauthenticated — allow signin and error pages
      if (isSignInPage || isAccessDeniedPage) return true;

      // Unauthenticated — deny (NextAuth will redirect to signin page)
      return false;
    },
  },
});
