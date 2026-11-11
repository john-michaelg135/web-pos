"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
      <Toaster position="top-right" offset={20} gap={10} />
    </ThemeProvider>
  );
}
