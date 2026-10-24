/** The seven Modules, named as the Enterprise Portal seeds them, in sidebar order. */
export const MODULES = [
  { name: "Dashboard", path: "/" },
  { name: "Sales Processing", path: "/sales-processing" },
  { name: "Order Management", path: "/order-management" },
  { name: "Product Management", path: "/product-management" },
  { name: "Stock Management", path: "/stock-management" },
  { name: "Sales Reports", path: "/manager/reports" },
  { name: "Location Management", path: "/location-management" },
] as const;

/** Starting Cash belongs to no Module; the Role guard owns it. */
const STARTING_CASH = "/manager/starting-cash";

const SUPER_ROLES = ["Super Admin", "CEO"];

/** The Roles that open each page outside every Module. */
const ROLES_FOR_PAGE: Record<string, string[]> = {
  [STARTING_CASH]: ["Cashier", "Manager", ...SUPER_ROLES],
};

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** The Module a page belongs to; a page beneath another follows it. */
export function moduleForPath(pathname: string): string | null {
  // The Dashboard is the root page alone; every other path is a page of its own Module.
  return MODULES.find((m) => (m.path === "/" ? pathname === "/" : under(pathname, m.path)))?.name ?? null;
}

/** The Roles that may open a page outside every Module, or null for any other page. */
export function rolesForPath(pathname: string): string[] | null {
  const base = Object.keys(ROLES_FOR_PAGE).find((b) => under(pathname, b));

  return base ? ROLES_FOR_PAGE[base] : null;
}
