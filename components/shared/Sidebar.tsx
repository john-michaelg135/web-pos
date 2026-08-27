"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mainNavItems, settingsNavItem, systems } from "./SidebarNav";
import { SidebarProfileFooter } from "./SidebarProfileFooter";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { open, openMobile, setOpenMobile, toggleSidebar, isMobile } =
    useSidebar();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = isMobile ? openMobile : open;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (mounted && !isOpen) {
    return null;
  }

  const SettingsIcon = settingsNavItem.icon;
  const isSettingsActive = pathname === settingsNavItem.href;

  const showSettings = !!session?.isSuperUser || session?.role === "Administrator";

  return (
    <>
      {isMobile && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
        />
      )}
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground z-[60] transition-all duration-300 shadow-xl md:shadow-none animate-in slide-in-from-left duration-300">
        <SidebarHeader className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors group">
                    <div className="flex flex-col min-w-0 pr-2">
                      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-sidebar-foreground truncate">
                        Bren Raphael&apos;s
                      </h1>
                      <button className="text-xs font-semibold bg-violet-500 text-white px-2 py-0.5 rounded truncate mt-0.5">
                        Point of Sale
                      </button>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sidebar-foreground transition-colors" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 bg-popover border-border text-popover-foreground z-[99999]"
                  align="start"
                  side="bottom"
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                    Select Enterprise Module
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {systems.map((sys) => {
                    const SysIcon = sys.icon;
                    return (
                      <DropdownMenuItem
                        key={sys.fullName}
                        className="cursor-pointer text-xs flex items-center justify-between py-2 px-2 hover:bg-accent font-medium"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <SysIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span
                              className={`font-semibold truncate ${sys.active ? "text-foreground font-bold" : ""}`}
                            >
                              {sys.fullName}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {sys.desc}
                            </span>
                          </div>
                        </div>
                        {sys.active && (
                          <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isMobile && (
              <SidebarTrigger
                className="text-muted-foreground hover:text-sidebar-foreground h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                title="Close Sidebar"
              >
                <X className="w-5 h-5" />
              </SidebarTrigger>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="p-4 overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Link href={item.href} onClick={handleNavClick}>
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-border space-y-2">
          {showSettings && (
            <SidebarMenu>
              <SidebarMenuItem key={settingsNavItem.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isSettingsActive}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors"
                >
                  <Link href={settingsNavItem.href} onClick={handleNavClick}>
                    <SettingsIcon className="w-4 h-4 shrink-0" />
                    <span>{settingsNavItem.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          <div className="pt-2 border-t border-border">
            <SidebarProfileFooter />
          </div>
        </SidebarFooter>

        <SidebarRail />
      </aside>
    </>
  );
}
