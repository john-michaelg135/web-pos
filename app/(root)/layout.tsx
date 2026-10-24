"use client";

import { AppShell } from "@/components/shared/AppShell";
import { LocationGate } from "@/components/shared/LocationGate";
import { useAuth } from "@/context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <LocationGate>
      <AppShell>{children}</AppShell>
    </LocationGate>
  );
}
