"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HeaderNotifications } from "./HeaderNotifications";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

function getBreadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [
      { label: "POS", href: "/" },
      { label: "Dashboard", isCurrent: true },
    ];
  }

  const items: Array<{ label: string; href?: string; isCurrent?: boolean }> = [
    { label: "POS", href: "/" },
  ];

  if (segments[0] === "sales-processing") {
    items.push({ label: "Sales Processing", isCurrent: true });
  } else if (segments[0] === "order-management") {
    items.push({ label: "Order Management", isCurrent: true });
  } else if (segments[0] === "stock-management") {
    items.push({ label: "Stock Management", isCurrent: true });
  } else if (segments[0] === "product-management") {
    items.push({ label: "Product Management", isCurrent: true });
  } else if (segments[0] === "manager") {
    items.push({ label: "Manager", href: "/manager/reports" });
    if (segments[1] === "reports") {
      items.push({ label: "Sales Reports", isCurrent: true });
    }
  } else if (segments[0] === "admin") {
    items.push({ label: "Admin", href: "/admin/locations" });
    if (segments[1] === "locations") {
      items.push({ label: "Locations", isCurrent: true });
    }
  } else {
    const pageName = segments[0]
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    items.push({ label: pageName, isCurrent: true });
  }

  return items;
}

export function Header() {
  const rawPathname = usePathname();
  const pathname = rawPathname || "/";
  const breadcrumbItems = getBreadcrumbItems(pathname);

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-6 h-16 bg-background border-b border-border">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 overflow-hidden">
        <SidebarTrigger className="h-9 w-9 shrink-0 hover:bg-accent text-foreground transition-all cursor-pointer" />
        <Separator orientation="vertical" className="h-5" />
        <Breadcrumb className="overflow-hidden">
          <BreadcrumbList className="flex-nowrap whitespace-nowrap text-sm sm:text-base font-semibold">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator className="text-muted-foreground [&>svg]:w-4 [&>svg]:h-4" />}
                <BreadcrumbItem>
                  {item.isCurrent ? (
                    <BreadcrumbPage className="font-bold text-foreground">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground font-semibold">
                      <Link href={item.href || "#"}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Notifications & Help */}
      <div className="flex items-center gap-1 shrink-0">
        <HeaderNotifications />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground w-8 h-8">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
