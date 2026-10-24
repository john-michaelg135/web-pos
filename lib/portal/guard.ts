import { NextResponse, type NextRequest } from "next/server";
import { accessFor } from "./access";
import type { Staff, Validation } from "./client";
import {
  LOGIN_PATH,
  NO_ACCESS_PATH,
  SESSION_COOKIE,
  SIGNING_IN_PATH,
  SIGN_IN_ERROR_PATH,
  UNAVAILABLE_PATH,
} from "./config";
import { MODULES, moduleForPath, rolesForPath } from "./modules";
import { isSuperUser } from "./roles";
import { MODULE_HEADER, STAFF_HEADER, encodeModules, encodeStaff } from "./staff-header";

const OPEN_PAGES = [NO_ACCESS_PATH, UNAVAILABLE_PATH, SIGN_IN_ERROR_PATH, SIGNING_IN_PATH];

/** Handoff routes, the api-pos proxy and the app's own API routes do their own checking. */
const isOpen = (pathname: string) =>
  OPEN_PAGES.includes(pathname) ||
  pathname.startsWith("/api/") ||
  pathname === "/api-pos" ||
  pathname.startsWith("/api-pos/");

/**
 * Asks the Enterprise Portal on every page request whether the Staff member may use the
 * page's Module. A pass-through response means the page may render.
 */
export async function guard(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // The page learns who the Staff member is from these headers, so a browser must never set them.
  const forwarded = new Headers(request.headers);
  forwarded.delete(STAFF_HEADER);
  forwarded.delete(MODULE_HEADER);

  const pass = () => NextResponse.next({ request: { headers: forwarded } });

  if (isOpen(pathname)) {
    return pass();
  }

  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const returnTo = encodeURIComponent(`${pathname}${search}`);
  const signIn = () => to(`${LOGIN_PATH}?returnTo=${returnTo}`);
  const unavailable = () => to(`${UNAVAILABLE_PATH}?returnTo=${returnTo}`);
  const access = accessFor(request.cookies.get(SESSION_COOKIE)?.value);

  const redirectFor = (decision: Validation["decision"]) =>
    decision === "unavailable" ? unavailable() : decision === "invalid" ? signIn() : null;

  /** Every Module the Staff member may open, for the sidebar; Super Admin and CEO open all of them. */
  const holdings = async (staff: Staff): Promise<{ modules: string[] } | { stop: NextResponse }> => {
    if (isSuperUser(staff.role)) return { modules: MODULES.map((m) => m.name) };

    const answers = await Promise.all(MODULES.map((m) => access.check(m.name)));

    for (const answer of answers) {
      const stop = redirectFor(answer.decision);

      if (stop) return { stop };
    }

    return { modules: MODULES.filter((_, i) => answers[i].decision === "allowed").map((m) => m.name) };
  };

  const roles = rolesForPath(pathname);

  if (roles) {
    const found = await access.role();

    if (found.decision === "allowed" && roles.includes(found.role)) {
      const held = await holdings(found.staff);

      if ("stop" in held) return held.stop;

      forwarded.set(STAFF_HEADER, encodeStaff(found.staff));
      forwarded.set(MODULE_HEADER, encodeModules(held.modules));

      return pass();
    }

    return redirectFor(found.decision) ?? to(NO_ACCESS_PATH);
  }

  const module = moduleForPath(pathname);

  if (!module) {
    return pass(); // not a POS page; the app's own 404 handles it
  }

  const asked = await access.check(module);

  if (asked.decision === "allowed") {
    const held = await holdings(asked.staff);

    if ("stop" in held) return held.stop;

    forwarded.set(STAFF_HEADER, encodeStaff(asked.staff));
    forwarded.set(MODULE_HEADER, encodeModules(held.modules));

    return pass();
  }

  const stop = redirectFor(asked.decision);

  if (stop) return stop;

  // Super Admin and CEO open every Module, whatever the Enterprise Portal granted.
  const known = await access.role();

  if (known.decision === "allowed" && isSuperUser(known.role)) {
    forwarded.set(STAFF_HEADER, encodeStaff(known.staff));
    forwarded.set(MODULE_HEADER, encodeModules(MODULES.map((m) => m.name)));

    return pass();
  }

  const halted = known.decision === "allowed" ? null : redirectFor(known.decision);

  if (halted) return halted;

  for (const candidate of MODULES) {
    if (candidate.name === module) continue;

    const found = await access.check(candidate.name);

    if (found.decision === "allowed") return to(candidate.path);

    const halted = redirectFor(found.decision);

    if (halted) return halted;
  }

  return to(NO_ACCESS_PATH);
}
