"use client";

import { SidebarProvider, useSharedTheme } from "@r3b2p/uilib";
import { Toaster } from "sonner";

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  useSharedTheme();
  return (
    <SidebarProvider>
      {children}
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
