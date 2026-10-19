"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
// TEMPORARY DEMO AUTH — remove after br-auth integration. See lib/demoAuth.tsx.
import { DemoRoleSwitcher } from "@/lib/demoAuth";

function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marginClass = !mounted || open ? "md:ml-64" : "md:ml-0";

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 transition-[margin] duration-300 ${marginClass} print:!ml-0 print:!pb-0 print:!m-0`}
    >
      <div className="print:hidden">
        <Header />
      </div>
      <main
        key={pathname}
        className="flex-1 w-full bg-background relative overflow-y-auto overflow-x-hidden print:!overflow-visible print:!bg-white print:!h-auto print:!min-h-0"
      >
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground relative print:!block print:!min-h-0 print:!bg-white">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <MainContent>{children}</MainContent>
        <div className="print:hidden">
          <MobileNav />
        </div>
        {/* DEMO AUTH: floating role switcher; self-hides when the flag is off. */}
        <div className="print:hidden">
          <DemoRoleSwitcher />
        </div>
      </div>
    </SidebarProvider>
  );
}
