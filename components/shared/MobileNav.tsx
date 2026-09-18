"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, ClipboardList, Package, BarChart3 } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Sales", href: "/sales-processing", icon: ShoppingCart },
    { name: "Orders", href: "/order-management", icon: ClipboardList },
    { name: "Stock", href: "/stock-management", icon: Package },
    { name: "Reports", href: "/manager/reports", icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
