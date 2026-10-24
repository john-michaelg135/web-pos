const SUPER_ROLES = ["Super Admin", "CEO"];

/** Whether the Module is among those the Enterprise Portal allowed; the action never narrows it. */
export function canUse(allowedModules: readonly string[], module: string): boolean {
  return allowedModules.includes(module);
}

export const isManager = (role: string | undefined) => role === "Manager";

/** Super Admin and CEO open every page outside a Module and see every location. */
export const isSuperUser = (role: string | undefined) => !!role && SUPER_ROLES.includes(role);

/** Super Admin and CEO are never asked for starting cash; every other Role, known or not, must declare it daily. */
export const startingCashRule = (role: string | undefined): "mandatory" | "exempt" =>
  isSuperUser(role) ? "exempt" : "mandatory";
