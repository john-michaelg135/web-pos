"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marginClass = !mounted || open ? "md:ml-72" : "md:ml-0";

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 md:h-svh transition-[margin] duration-300 ${marginClass} print:!ml-0 print:!pb-0 print:!m-0 print:!h-auto`}
    >
      {/* Sticky on the wrapper: a sticky child cannot outlive a parent that is only as tall as itself. */}
      <div className="sticky top-0 z-50 print:hidden">
        <Header />
      </div>
      {/* From md up only <main> scrolls (the window doesn't), and its stable gutter keeps every page the same width. */}
      <main
        key={pathname}
        className="flex-1 w-full bg-background relative overflow-y-auto overflow-x-hidden md:min-h-0 md:[scrollbar-gutter:stable] print:!overflow-visible print:!bg-white print:!h-auto print:!min-h-0"
      >
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen md:h-svh md:overflow-hidden w-full bg-background text-foreground relative print:!block print:!min-h-0 print:!h-auto print:!overflow-visible print:!bg-white">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <MainContent>{children}</MainContent>
        <div className="print:hidden">
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
