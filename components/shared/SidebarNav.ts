import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  BoxesIcon,
  BarChart3,
  Settings,
  Building2,
  Users2,
  CreditCard,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { POS_MODULES } from "@/lib/permissions";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** br-auth POS module name that guards this item (must have read access). */
  module: string;
}

export interface SystemItem {
  fullName: string;
  desc: string;
  icon: LucideIcon;
  active: boolean;
}

export const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, module: POS_MODULES.DASHBOARD },
  { name: "Sales Processing", href: "/sales-processing", icon: ShoppingCart, module: POS_MODULES.SALES_PROCESSING },
  { name: "Order Management", href: "/order-management", icon: ClipboardList, module: POS_MODULES.ORDER_MANAGEMENT },
  { name: "Product Management", href: "/product-management", icon: BoxesIcon, module: POS_MODULES.PRODUCT_MANAGEMENT },
  { name: "Stock Management", href: "/stock-management", icon: Package, module: POS_MODULES.STOCK_MANAGEMENT },
  { name: "Sales Reports", href: "/manager/reports", icon: BarChart3, module: POS_MODULES.SALES_REPORTS },
];

export const settingsNavItem: NavItem = {
  name: "Admin",
  href: "/admin/locations",
  icon: Settings,
  module: POS_MODULES.LOCATIONS,
};

export const systems: SystemItem[] = [
  {
    fullName: "Point of Sale",
    desc: "Retail & register checkout",
    icon: CreditCard,
    active: true,
  },
  {
    fullName: "Customer Relationship Management",
    desc: "Contact profiles, tickets & marketing",
    icon: Building2,
    active: false,
  },
  {
    fullName: "Human Resource Management",
    desc: "Staff directory & payroll",
    icon: Users2,
    active: false,
  },
  {
    fullName: "Supply Chain Management",
    desc: "Inventory & logistics",
    icon: Truck,
    active: false,
  },
];
