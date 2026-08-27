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

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface SystemItem {
  fullName: string;
  desc: string;
  icon: LucideIcon;
  active: boolean;
}

export const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Sales Processing", href: "/sales-processing", icon: ShoppingCart },
  { name: "Order Management", href: "/order-management", icon: ClipboardList },
  { name: "Product Management", href: "/product-management", icon: BoxesIcon },
  { name: "Stock Management", href: "/stock-management", icon: Package },
  { name: "Sales Reports", href: "/manager/reports", icon: BarChart3 },
];

export const settingsNavItem: NavItem = {
  name: "Admin",
  href: "/admin/locations",
  icon: Settings,
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
