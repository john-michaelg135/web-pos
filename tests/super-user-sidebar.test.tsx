import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StaffProvider } from "@/context/AuthContext";
import { guard } from "@/lib/portal/guard";
import { MODULE_HEADER, STAFF_HEADER, staffFromHeaders } from "@/lib/portal/staff-header";
import { FAKE_PORTAL_URL, FAKE_SECRET, FAKE_SYSTEM, FakePortal, portalFetch } from "./fake-portal";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const APP = "https://localhost:3002";
const ALL = ["Dashboard", "Sales Processing", "Order Management", "Product Management", "Stock Management", "Sales Reports", "Location Management"];
const PATHS = ["/", "/sales-processing", "/order-management", "/product-management", "/stock-management", "/manager/reports", "/location-management"];

async function signIn(role: string, modules: string[]) {
  const portal = new FakePortal();
  portal.addStaff("ada", { name: "Ada Okafor", username: "ada.okafor", email: "ada@brenraphaels.test", role }, modules);
  portal.signIn("ada");
  vi.stubGlobal("fetch", portalFetch(portal));

  const verifier = "v".repeat(43);
  const redirect_uri = `${APP}/api/portal/callback`;
  const authorized = await fetch(
    `${FAKE_PORTAL_URL}/api/integrations/authorize?` +
      new URLSearchParams({
        system: FAKE_SYSTEM,
        redirect_uri,
        state: "s",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      }),
    { redirect: "manual" },
  );
  const code = new URL(authorized.headers.get("location")!).searchParams.get("code");
  const exchanged = await fetch(`${FAKE_PORTAL_URL}/api/integrations/exchange`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${FAKE_SYSTEM}:${FAKE_SECRET}`).toString("base64")}` },
    body: JSON.stringify({ code, state: "s", code_verifier: verifier, redirect_uri }),
  });

  return (await exchanged.json()).handle as string;
}

beforeEach(() => {
  vi.stubEnv("PORTAL_URL", FAKE_PORTAL_URL);
  vi.stubEnv("PORTAL_SYSTEM_NAME", FAKE_SYSTEM);
  vi.stubEnv("PORTAL_SYSTEM_SECRET", FAKE_SECRET);
  vi.stubEnv("POS_APP_URL", APP);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Admin and CEO sidebar", () => {
  const forwarded = (response: Response) =>
    staffFromHeaders(
      new Headers({
        [STAFF_HEADER]: response.headers.get(`x-middleware-request-${STAFF_HEADER}`) ?? "",
        [MODULE_HEADER]: response.headers.get(`x-middleware-request-${MODULE_HEADER}`) ?? "",
      }),
    );

  const sidebarLinks = (staff: Parameters<typeof StaffProvider>[0]["staff"], modules: string[]) => {
    const html = renderToStaticMarkup(
      <StaffProvider staff={staff} modules={modules}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </StaffProvider>,
    );

    return [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
  };

  it.each(["Admin", "CEO"])("shows a %s granted only the Dashboard just the Dashboard", async (role) => {
    const cookie = `pos_session=${await signIn(role, ["Dashboard"])}`;

    for (const path of PATHS.filter((p) => p !== "/")) {
      const response = await guard(new NextRequest(`${APP}${path}`, { headers: { cookie } }));

      expect(new URL(response.headers.get("location")!).pathname, path).toBe("/");
    }

    const { staff, modules } = forwarded(await guard(new NextRequest(`${APP}/`, { headers: { cookie } })))!;
    const links = sidebarLinks(staff, modules);

    expect(modules).toEqual(["Dashboard"]);
    expect(links).toContain("/");
    for (const path of PATHS.filter((p) => p !== "/")) expect(links).not.toContain(path);
  });

  it.each(["Admin", "CEO"])("shows all seven Modules to a %s granted all of them", async (role) => {
    const cookie = `pos_session=${await signIn(role, ALL)}`;

    for (const path of PATHS) {
      const response = await guard(new NextRequest(`${APP}${path}`, { headers: { cookie } }));

      expect(response.headers.get("location"), path).toBeNull();
    }

    const { staff, modules } = forwarded(await guard(new NextRequest(`${APP}/`, { headers: { cookie } })))!;
    const links = sidebarLinks(staff, modules);

    for (const path of PATHS) expect(links).toContain(path);
    expect(modules).toEqual(ALL);
  });
});
