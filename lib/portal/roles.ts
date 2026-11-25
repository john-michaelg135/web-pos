/** The owner Roles, named as the Enterprise Portal returns them (the Portal renamed "Admin" to "Admin"). */
export const SUPER_ROLES: readonly string[] = ["Admin", "CEO"];

/** Whether the Module is among those the Enterprise Portal allowed; the action never narrows it. */
export function canUse(allowedModules: readonly string[], module: string): boolean {
  return allowedModules.includes(module);
}

export const isManager = (role: string | undefined) =>
  role === "Manager" || role === "POS Manager";

/** Admin and CEO open every page outside a Module and see every location. */
export const isSuperUser = (role: string | undefined) => !!role && SUPER_ROLES.includes(role);

/** A manager over every location, limited to the Modules the Enterprise Portal granted; never the Dashboard. */
export const isGeneralManager = (role: string | undefined) => role === "General Manager";

/** Admin, CEO and General Manager see every location and use the location selector. */
export const seesAllLocations = (role: string | undefined) =>
  isSuperUser(role) || isGeneralManager(role);

/** Managers are prompted but may skip; administrators and General Managers are exempt; others must declare daily. */
export const startingCashRule = (
  role: string | undefined,
): "mandatory" | "optional" | "exempt" =>
  seesAllLocations(role) ? "exempt" : isManager(role) ? "optional" : "mandatory";

/** The POS-PROBE role a POS role opens the probe as: the owner (Admin, CEO) or a manager; anyone else can't. */
export const probeRoleFor = (role: string | undefined): "owner" | "manager" | null =>
  isSuperUser(role) ? "owner" : isManager(role) ? "manager" : null;
