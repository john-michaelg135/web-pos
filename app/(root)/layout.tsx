"use client";

import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { LocationGate } from "@/components/shared/LocationGate";

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

  // Non-super users without an assigned branch are held at a "processing"
  // screen until an admin assigns them a location.
  return (
    <LocationGate>
      <AppShell>{children}</AppShell>
    </LocationGate>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutInner>{children}</RootLayoutInner>;
}
