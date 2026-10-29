"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Check, X } from "lucide-react";
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
import { absoluteUrl, groupNavItems, navItemsFor, systems } from "./SidebarNav";
import { ReturningToPortalCard } from "./ReturningToPortalCard";
import { SidebarProfileFooter } from "./SidebarProfileFooter";
import { useAuth } from "@/context/AuthContext";
import { MODULES } from "@/lib/portal/modules";
import { useNavClick, useNavigationPending } from "./NavigationPending";

export function Sidebar() {
  const pathname = usePathname();
  const { can } = useAuth();
  const { open, openMobile, setOpenMobile, toggleSidebar, isMobile } =
    useSidebar();
  const [mounted, setMounted] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = isMobile ? openMobile : open;

  const navClick = useNavClick();
  const { pendingHref } = useNavigationPending();
  // Highlight the tab being opened right away, before its page has arrived.
  const activePath = pendingHref ?? pathname;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (mounted && !isOpen) {
    return null;
  }

  const visibleNavItems = navItemsFor(MODULES.map((m) => m.name).filter((name) => can(name)));

  return (
    <>
      {returning && <ReturningToPortalCard portalUrl={returning} />}
      {isMobile && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
        />
      )}
      <aside className="fixed left-0 top-0 h-full w-72 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground z-[60] transition-all duration-300 shadow-xl md:shadow-none animate-in slide-in-from-left duration-300 print:hidden">
        <SidebarHeader className="h-24 justify-center py-0 pl-3.5 pr-2.5 border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center p-1 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-colors group gap-[11px]">
                    <Image
                      src="/images/bren-raphaels-logo.svg"
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="size-11 shrink-0 rounded-[10px]"
                    />
                    <div className="flex flex-col min-w-0 gap-1.5 pr-1">
                      <h1 className="text-xl font-bold text-zinc-900 truncate leading-none">
                        Bren Raphael&apos;s
                      </h1>
                      <span className="text-[11px] font-semibold bg-[#f3e8ff] text-[#6d28d9] px-2 py-[3px] rounded-md truncate w-fit inline-block">
                        Point of Sale
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sidebar-foreground transition-colors" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[calc(100vw-2rem)] max-w-[20rem] bg-popover border border-border text-popover-foreground z-[99999] p-1.5 space-y-0.5 shadow-xl rounded-xl"
                  align="start"
                  side="bottom"
                  sideOffset={6}
                >
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider px-2.5 pt-1.5 pb-2">
                    Select Enterprise Module
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="-mx-1.5 mt-0 mb-1 bg-border" />
                  {systems.map((sys) => {
                    const SysIcon = sys.icon;
                    return (
                      <DropdownMenuItem
                        key={sys.fullName}
                        onSelect={() => {
                          if (sys.active || !sys.url) return;
                          const url = absoluteUrl(sys.url);
                          if (sys.isPortal) setReturning(url);
                          else window.location.assign(url);
                        }}
                        className={`cursor-pointer flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors gap-3 ${
                          sys.active
                            ? "bg-violet-500/10 focus:bg-violet-500/10"
                            : "hover:bg-accent focus:bg-accent"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              sys.active
                                ? "bg-violet-600 text-white shadow-xs"
                                : "bg-violet-500/[0.07] text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            <SysIcon className="size-4 shrink-0" strokeWidth={1.75} />
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden flex-1 justify-center gap-0.5">
                            <span
                              className={`text-xs truncate leading-snug text-foreground ${
                                sys.active ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {sys.fullName}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate leading-tight">
                              {sys.desc}
                            </span>
                          </div>
                        </div>
                        {sys.active && (
                          <div className="size-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-xs">
                            <Check className="size-3 stroke-[3]" />
                          </div>
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

        <SidebarContent className="px-3 py-4 overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {groupNavItems(visibleNavItems).map((group, index) => (
                  <React.Fragment key={group.label || "top"}>
                    {group.label && (
                      <li
                        aria-hidden
                        className={`pb-1.5 pl-2.5 text-[11px] font-semibold tracking-wide text-zinc-400 list-none ${
                          index === 0 ? "pt-1" : "pt-[18px]"
                        }`}
                      >
                        {group.label}
                      </li>
                    )}
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === "/"
                          ? activePath === "/"
                          : activePath === item.href || activePath?.startsWith(item.href + "/");
                      return (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="h-auto w-full flex items-center gap-3 px-2.5 py-[9px] rounded-lg text-[15px] font-medium text-sidebar-foreground transition-colors data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                          >
                            <Link
                              href={item.href}
                              onClick={(e) => {
                                navClick(item.href)(e);
                                handleNavClick();
                              }}
                              prefetch={false}
                            >
                              <Icon className="size-[18px] shrink-0" />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </React.Fragment>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="py-3.5 pl-4 pr-3 border-t border-sidebar-border">
          <SidebarProfileFooter />
        </SidebarFooter>

        <SidebarRail />
      </aside>
    </>
  );
}
