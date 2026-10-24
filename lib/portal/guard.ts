import { NextResponse, type NextRequest } from "next/server";
import { accessFor } from "./access";
import type { Validation } from "./client";
import {
  LOGIN_PATH,
  NO_ACCESS_PATH,
  SESSION_COOKIE,
  SIGNING_IN_PATH,
  SIGN_IN_ERROR_PATH,
  UNAVAILABLE_PATH,
} from "./config";
import { MODULES, isOutsideEveryModule, moduleForPath } from "./modules";

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

  if (isOpen(pathname)) {
    return NextResponse.next();
  }

  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const returnTo = encodeURIComponent(`${pathname}${search}`);
  const signIn = () => to(`${LOGIN_PATH}?returnTo=${returnTo}`);
  const unavailable = () => to(`${UNAVAILABLE_PATH}?returnTo=${returnTo}`);
  const access = accessFor(request.cookies.get(SESSION_COOKIE)?.value);

  if (isOutsideEveryModule(pathname)) {
    // Held closed until the Role guard decides these pages.
    return to(NO_ACCESS_PATH);
  }

  const module = moduleForPath(pathname);

  if (!module) {
    return NextResponse.next(); // not a POS page; the app's own 404 handles it
  }

  const redirectFor = (decision: Validation["decision"]) =>
    decision === "unavailable" ? unavailable() : decision === "invalid" ? signIn() : null;

  const asked = await access.check(module);

  if (asked.decision === "allowed") {
    return NextResponse.next();
  }

  const stop = redirectFor(asked.decision);

  if (stop) return stop;

  for (const candidate of MODULES) {
    if (candidate.name === module) continue;

    const found = await access.check(candidate.name);

    if (found.decision === "allowed") return to(candidate.path);

    const halted = redirectFor(found.decision);

    if (halted) return halted;
  }

  return to(NO_ACCESS_PATH);
}
