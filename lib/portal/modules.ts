/** The six Modules, named as the Enterprise Portal seeds them, in sidebar order. */
export const MODULES = [
  { name: "Dashboard", path: "/" },
  { name: "Sales Processing", path: "/sales-processing" },
  { name: "Order Management", path: "/order-management" },
  { name: "Product Management", path: "/product-management" },
  { name: "Stock Management", path: "/stock-management" },
  { name: "Sales Reports", path: "/manager/reports" },
] as const;

/** Starting Cash and Locations belong to no Module; the Role guard owns them. */
const OUTSIDE_EVERY_MODULE = ["/manager/starting-cash", "/admin/locations"];

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** The Module a page belongs to; a page beneath another follows it. */
export function moduleForPath(pathname: string): string | null {
  // The Dashboard is the root page alone; every other path is a page of its own Module.
  return MODULES.find((m) => (m.path === "/" ? pathname === "/" : under(pathname, m.path)))?.name ?? null;
}

export function isOutsideEveryModule(pathname: string): boolean {
  return OUTSIDE_EVERY_MODULE.some((base) => under(pathname, base));
}
