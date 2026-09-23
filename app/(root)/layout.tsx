"use client";

import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { LocationGate } from "@/components/shared/LocationGate";
// TEMPORARY DEMO AUTH — remove after br-auth integration. See lib/demoAuth.tsx.
import { isDemoAuth, DemoAccessGuard } from "@/lib/demoAuth";

function RootLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  // DEMO AUTH: reproduce the middleware's per-role page gating client-side,
  // since the OIDC middleware is bypassed in demo mode.
  const shell = (
    <LocationGate>
      <AppShell>{children}</AppShell>
    </LocationGate>
  );

  // Non-super users without an assigned branch are held at a "processing"
  // screen until an admin assigns them a location.
  return isDemoAuth() ? <DemoAccessGuard>{shell}</DemoAccessGuard> : shell;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutInner>{children}</RootLayoutInner>;
}
