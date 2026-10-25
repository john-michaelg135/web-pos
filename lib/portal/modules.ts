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
const MANAGER_ROLES = ["POS Manager", "Manager"];

const MODULES_FOR_ROLE: Record<string, readonly string[]> = {
  Cashier: ["Sales Processing", "Order Management"],
  Manager: [
    "Sales Processing",
    "Order Management",
    "Product Management",
    "Stock Management",
    "Sales Reports",
  ],
  "POS Manager": [
    "Sales Processing",
    "Order Management",
    "Product Management",
    "Stock Management",
    "Sales Reports",
  ],
};

/** The Roles that open each page outside every Module. */
const ROLES_FOR_PAGE: Record<string, string[]> = {
  [STARTING_CASH]: ["Cashier", ...MANAGER_ROLES, ...SUPER_ROLES],
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

/** The POS modules a role may use, regardless of any stale extra user grants. */
export function modulesForRole(role: string): readonly string[] {
  if (SUPER_ROLES.includes(role)) return MODULES.map(({ name }) => name);
  return MODULES_FOR_ROLE[role] ?? [];
}

export function roleMayUseModule(role: string, module: string): boolean {
  return modulesForRole(role).includes(module);
}

export function isPosManager(role: string | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export function mayPerformAction(
  role: string | undefined,
  module: string,
  action: "read" | "write" | "update" | "delete" | "approve" | "export",
): boolean {
  if (!role || !roleMayUseModule(role, module)) return false;
  if (SUPER_ROLES.includes(role)) return true;

  if (role === "Cashier") {
    return action === "read" ||
      (action === "write" && ["Sales Processing", "Order Management"].includes(module));
  }

  if (!isPosManager(role)) return false;

  if (action === "read") return true;
  if (action === "approve") {
    return ["Order Management", "Stock Management"].includes(module);
  }
  if (action === "export") return module === "Sales Reports";
  if (module === "Sales Processing") return action === "write";
  if (module === "Order Management") return ["write", "update"].includes(action);
  if (module === "Product Management") return ["write", "update"].includes(action);
  if (module === "Stock Management") return ["write", "update"].includes(action);
  return false;
}

export function firstModulePathForRole(role: string): string | null {
  return MODULES.find(({ name }) => modulesForRole(role).includes(name))?.path ?? null;
}
