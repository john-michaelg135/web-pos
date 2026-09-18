"use client";

import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";

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

  return <AppShell>{children}</AppShell>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutInner>{children}</RootLayoutInner>;
}
