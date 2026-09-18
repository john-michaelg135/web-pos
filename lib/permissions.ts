/**
 * Granular RBAC helpers for the POS frontend.
 *
 * The session carries a compact permissions map (see auth.ts):
 *   { "<POS Module Name>": "rwu", ... }
 * where each letter is a granted action:
 *   r = read, w = write, u = update, d = delete, a = approve, e = export
 *
 * br-auth POS module names (from the auth service seeder):
 *   "Dashboard", "Sales Processing", "Order Management",
 *   "Product Management/Price Configuration", "Sales Report Analytics",
 *   "Location/Branch Management", "Stock Management"
 */

export type PosAction = "read" | "write" | "update" | "delete" | "approve" | "export";

const ACTION_LETTER: Record<PosAction, string> = {
  read: "r",
  write: "w",
  update: "u",
  delete: "d",
  approve: "a",
  export: "e",
};

/** Canonical br-auth module names. */
export const POS_MODULES = {
  DASHBOARD: "Dashboard",
  SALES_PROCESSING: "Sales Processing",
  ORDER_MANAGEMENT: "Order Management",
  PRODUCT_MANAGEMENT: "Product Management/Price Configuration",
  SALES_REPORTS: "Sales Report Analytics",
  LOCATIONS: "Location/Branch Management",
  STOCK_MANAGEMENT: "Stock Management",
} as const;

/**
 * Maps a route path (prefix) to the br-auth module that guards it.
 * Longest-prefix match wins so nested admin routes resolve correctly.
 */
const ROUTE_MODULE_MAP: { prefix: string; module: string }[] = [
  { prefix: "/sales-processing", module: POS_MODULES.SALES_PROCESSING },
  { prefix: "/order-management", module: POS_MODULES.ORDER_MANAGEMENT },
  { prefix: "/product-management", module: POS_MODULES.PRODUCT_MANAGEMENT },
  { prefix: "/stock-management", module: POS_MODULES.STOCK_MANAGEMENT },
  { prefix: "/manager/reports", module: POS_MODULES.SALES_REPORTS },
  { prefix: "/admin/locations", module: POS_MODULES.LOCATIONS },
  { prefix: "/", module: POS_MODULES.DASHBOARD },
];

export type PermissionsMap = Record<string, string>;

/** Returns the module name that guards the given path, or null if none. */
export function moduleForPath(pathname: string): string | null {
  // Sort by prefix length desc so "/manager/reports" beats "/".
  const match = [...ROUTE_MODULE_MAP]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) =>
      prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(prefix + "/")
    );
  return match?.module ?? null;
}

/** Does the permissions map grant `action` on `moduleName`? */
export function can(
  permissions: PermissionsMap | undefined,
  moduleName: string,
  action: PosAction
): boolean {
  const granted = permissions?.[moduleName];
  if (!granted) return false;
  return granted.includes(ACTION_LETTER[action]);
}

/** Does the user have at least read access to `moduleName`? */
export function canRead(permissions: PermissionsMap | undefined, moduleName: string): boolean {
  return can(permissions, moduleName, "read");
}

/**
 * Can the user (super user or granular) access the module guarding `pathname`?
 * Super users always pass. Paths with no mapped module are treated as open.
 */
export function canAccessPath(
  pathname: string,
  permissions: PermissionsMap | undefined,
  isSuperUser: boolean
): boolean {
  if (isSuperUser) return true;
  const moduleName = moduleForPath(pathname);
  if (!moduleName) return true; // unmapped route (e.g. /access-denied, /signin)
  return canRead(permissions, moduleName);
}

/**
 * The nav order used to decide where to land a user who hits a page they can't
 * access. Mirrors the sidebar order so users go to their "first" tab.
 */
const LANDING_ORDER: { path: string; module: string }[] = [
  { path: "/", module: POS_MODULES.DASHBOARD },
  { path: "/sales-processing", module: POS_MODULES.SALES_PROCESSING },
  { path: "/order-management", module: POS_MODULES.ORDER_MANAGEMENT },
  { path: "/product-management", module: POS_MODULES.PRODUCT_MANAGEMENT },
  { path: "/stock-management", module: POS_MODULES.STOCK_MANAGEMENT },
  { path: "/manager/reports", module: POS_MODULES.SALES_REPORTS },
  { path: "/admin/locations", module: POS_MODULES.LOCATIONS },
];

/**
 * Returns the first route the user has read access to, or null if the user has
 * no readable POS module at all.
 */
export function firstAccessiblePath(permissions: PermissionsMap | undefined): string | null {
  const match = LANDING_ORDER.find(({ module }) => canRead(permissions, module));
  return match?.path ?? null;
}
