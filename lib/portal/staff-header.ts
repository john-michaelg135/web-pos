import type { Staff } from "./client";

/** Set by the guard once the Enterprise Portal has allowed the page; never trusted from a browser. */
export const STAFF_HEADER = "x-pos-staff";
export const MODULE_HEADER = "x-pos-module";

/** Module names carry no commas, so a comma-separated list is enough. */
export const encodeModules = (modules: readonly string[]): string => modules.join(",");

export function encodeStaff(staff: Staff): string {
  return Buffer.from(JSON.stringify(staff)).toString("base64url");
}

export function staffFromHeaders(headers: Headers): { staff: Staff; modules: string[] } | null {
  const raw = headers.get(STAFF_HEADER);

  if (!raw) return null;

  try {
    const staff = JSON.parse(Buffer.from(raw, "base64url").toString());

    if (typeof staff?.name !== "string" || typeof staff.role !== "string") return null;

    const allowed = headers.get(MODULE_HEADER);

    return { staff, modules: allowed ? allowed.split(",") : [] };
  } catch {
    return null;
  }
}
