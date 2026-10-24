"use client";

import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full gap-4 px-4 sm:px-6 h-16 bg-background border-b border-sidebar-border">
      <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md hover:bg-sidebar-accent text-foreground transition-all cursor-pointer" />
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Notifications"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground transition-all hover:bg-sidebar-accent cursor-pointer"
      >
        <Bell className="size-[18px]" />
      </button>
    </header>
  );
}
