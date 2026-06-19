"use client";

import { SidebarProvider, useSharedTheme } from "@r3b2p/uilib";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  useSharedTheme();
  return (
    <ThemeProvider>
      <SidebarProvider>
        {children}
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </ThemeProvider>
  );
}
