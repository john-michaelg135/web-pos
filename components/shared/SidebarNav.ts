import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  BoxesIcon,
  BarChart3,
  Building2,
  Users2,
  CreditCard,
  Boxes,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULES } from "@/lib/portal/modules";

export interface NavItem {
  /** The label above its section of the sidebar; empty for the Dashboard, which sits alone on top. */
  group: string;
  /** The Module's name, as the Enterprise Portal seeds it. */
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface SystemItem {
  fullName: string;
  desc: string;
  icon: LucideIcon;
  /** Where the entry opens; absent for POS, which is already open. */
  url?: string;
  active: boolean;
  /** The Enterprise Portal entry shows the returning card before leaving. */
  isPortal?: boolean;
}

const ICONS: Record<(typeof MODULES)[number]["name"], LucideIcon> = {
  Dashboard: LayoutDashboard,
  "Sales Processing": ShoppingCart,
  "Order Management": ClipboardList,
  "Product Management": BoxesIcon,
  "Stock Management": Package,
  "Sales Reports": BarChart3,
  "Location Management": MapPin,
};

const GROUPS: Record<(typeof MODULES)[number]["name"], string> = {
  Dashboard: "",
  "Sales Processing": "SALES",
  "Order Management": "SALES",
  "Product Management": "CATALOG",
  "Stock Management": "CATALOG",
  "Sales Reports": "INSIGHTS",
  "Location Management": "ADMIN",
};

/** The seven Modules in sidebar order. */
export const mainNavItems: NavItem[] = MODULES.map(({ name, path }) => ({
  group: GROUPS[name],
  name,
  href: path,
  icon: ICONS[name],
}));

/** The items for the Modules the Enterprise Portal allowed, in sidebar order. */
export const navItemsFor = (allowedModules: readonly string[]): NavItem[] =>
  mainNavItems.filter((item) => allowedModules.includes(item.name));

// NEXT_PUBLIC_ values are inlined at build time, so each is read by its literal name.
export const systems: SystemItem[] = [
  {
    fullName: "Enterprise Portal",
    desc: "Sign-in and access for every system",
    icon: ShieldCheck,
    url: process.env.NEXT_PUBLIC_PORTAL_URL || "https://br-auth-three.vercel.app",
    active: false,
    isPortal: true,
  },
  {
    fullName: "CRM",
    desc: "Contact profiles, tickets & marketing",
    icon: Building2,
    url: process.env.NEXT_PUBLIC_CRM_URL || "https://epic-crms.vercel.app",
    active: false,
  },
  {
    fullName: "HRM",
    desc: "Staff directory & payroll",
    icon: Users2,
    url: process.env.NEXT_PUBLIC_HRM_URL || "https://hrms-arae.vercel.app",
    active: false,
  },
  {
    fullName: "POS",
    desc: "Retail & register checkout",
    icon: CreditCard,
    active: true,
  },
  {
    fullName: "IMS",
    desc: "Inventory & logistics",
    icon: Boxes,
    url: process.env.NEXT_PUBLIC_IMS_URL || "https://br-sims.vercel.app",
    active: false,
  },
];

/** The items under their group label, groups in order of first appearance. */
export const groupNavItems = (items: readonly NavItem[]): { label: string; items: NavItem[] }[] =>
  items.reduce<{ label: string; items: NavItem[] }[]>((groups, item) => {
    const group = groups.find((g) => g.label === item.group);

    if (group) group.items.push(item);
    else groups.push({ label: item.group, items: [item] });

    return groups;
  }, []);

/** A bare host in an env var still has to open as an absolute address. */
export const absoluteUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);
