import nextConfig from "../next.config";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guard } from "@/lib/portal/guard";
import { MODULE_HEADER, STAFF_HEADER, staffFromHeaders } from "@/lib/portal/staff-header";
import { FAKE_PORTAL_URL, FAKE_SECRET, FAKE_SYSTEM, FakePortal, portalFetch } from "./fake-portal";

const APP = "https://localhost:3002";
const ada = {
  name: "Ada Okafor",
  username: "ada.okafor",
  email: "ada@brenraphaels.test",
  role: "Cashier",
};
const ALL = [
  "Dashboard",
  "Sales Processing",
  "Order Management",
  "Product Management",
  "Stock Management",
  "Sales Reports",
  "Location Management",
];

let portal: FakePortal;

let handle: string;

async function signInAda(modules: string[], role = ada.role) {
  portal = new FakePortal();
  portal.addStaff("ada", { ...ada, role }, modules);
  portal.signIn("ada");
  vi.stubGlobal("fetch", portalFetch(portal));
  const { createHash } = await import("node:crypto");
  const verifier = "v".repeat(43);
  const authorized = await fetch(
    `${FAKE_PORTAL_URL}/api/integrations/authorize?` +
      new URLSearchParams({
        system: FAKE_SYSTEM,
        redirect_uri: `${APP}/api/portal/callback`,
        state: "s",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      }),
    { redirect: "manual" },
  );
  const code = new URL(authorized.headers.get("location")!).searchParams.get("code");
  const exchanged = await fetch(`${FAKE_PORTAL_URL}/api/integrations/exchange`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${FAKE_SYSTEM}:${FAKE_SECRET}`).toString("base64")}`,
    },
    body: JSON.stringify({
      code,
      state: "s",
      code_verifier: verifier,
      redirect_uri: `${APP}/api/portal/callback`,
    }),
  });
  handle = (await exchanged.json()).handle;
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

const forwardedModules = async (path: string) => {
  const response = await guard(
    new NextRequest(`${APP}${path}`, { headers: { cookie: `pos_session=${handle}` } }),
  );

  return staffFromHeaders(
    new Headers({
      [STAFF_HEADER]: response.headers.get(`x-middleware-request-${STAFF_HEADER}`) ?? "",
      [MODULE_HEADER]: response.headers.get(`x-middleware-request-${MODULE_HEADER}`) ?? "",
    }),
  )?.modules;
};

const visit = async (path: string, withSession = true) => {
  const response = await guard(
    new NextRequest(`${APP}${path}`, {
      headers: withSession ? { cookie: `pos_session=${handle}` } : undefined,
    }),
  );
  const location = response.headers.get("location");

  return location ? new URL(location).pathname + new URL(location).search : "pass";
};

describe("module guard", () => {
  it("turns away a Manager without Location Management, whatever the Role", async () => {
    await signInAda(["Dashboard"], "Manager");

    expect(await visit("/location-management")).toBe("/");
  });

  it("turns away a Cashier without Location Management from /location-management", async () => {
    await signInAda(["Dashboard"], "Cashier");

    expect(await visit("/location-management")).not.toBe("pass");
  });

  it("redirects /admin/locations permanently to /location-management", async () => {
    const redirects = await nextConfig.redirects!();
    const old = redirects.find((r) => r.source === "/admin/locations");

    expect(old).toMatchObject({ destination: "/location-management", permanent: true });
  });

  it.each([
    ["/", "Dashboard"],
    ["/sales-processing", "Sales Processing"],
    ["/order-management", "Order Management"],
    ["/product-management", "Product Management"],
    ["/stock-management", "Stock Management"],
    ["/manager/reports", "Sales Reports"],
    ["/location-management", "Location Management"],
  ])("opens %s only with the %s Module, and its child paths follow", async (path, module) => {
    await signInAda([module]);
    expect(await visit(path)).toBe("pass");
    if (path !== "/") expect(await visit(`${path}/details/1`)).toBe("pass");

    await signInAda(ALL.filter((m) => m !== module));
    expect(await visit(path)).not.toBe("pass");
    if (path !== "/") expect(await visit(`${path}/details/1`)).not.toBe("pass");
  });

  it("forwards every allowed Module, not just the page's, for the sidebar", async () => {
    await signInAda(["Dashboard", "Stock Management", "Sales Reports"]);

    expect(await forwardedModules("/stock-management")).toEqual([
      "Dashboard",
      "Stock Management",
      "Sales Reports",
    ]);
  });

  it("forwards a Module list that shrinks on the next load once a Module is revoked", async () => {
    await signInAda(["Dashboard", "Stock Management", "Sales Reports"]);
    portal.revoke("ada", "Sales Reports");

    expect(await forwardedModules("/stock-management")).toEqual(["Dashboard", "Stock Management"]);
  });

  it("forwards the full list on a Role-gated page too", async () => {
    await signInAda(["Dashboard", "Stock Management"], "Manager");

    expect(await forwardedModules("/manager/starting-cash")).toEqual(["Dashboard", "Stock Management"]);
  });

  it("replaces a Module list sent by the browser on an allowed page", async () => {
    await signInAda(["Stock Management"]);
    const response = await guard(
      new NextRequest(`${APP}/stock-management`, {
        headers: { cookie: `pos_session=${handle}`, [MODULE_HEADER]: ALL.join(","), [STAFF_HEADER]: "forged" },
      }),
    );
    const seen = new Headers({
      [STAFF_HEADER]: response.headers.get(`x-middleware-request-${STAFF_HEADER}`) ?? "",
      [MODULE_HEADER]: response.headers.get(`x-middleware-request-${MODULE_HEADER}`) ?? "",
    });

    expect(staffFromHeaders(seen)).toEqual({
      staff: expect.objectContaining({ username: "ada.okafor" }),
      modules: ["Stock Management"],
    });
  });

  it("shows unavailable when the Enterprise Portal fails on a Module other than the page's", async () => {
    await signInAda(["Stock Management"]);
    const working = fetch;
    let calls = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (++calls > 1) throw new Error("network down");
      return working(input, init);
    });

    expect(await visit("/stock-management")).toBe("/unavailable?returnTo=%2Fstock-management");
  });

  it.each(["Super Admin", "CEO"])("opens every Module for %s whatever the Enterprise Portal granted", async (role) => {
    await signInAda(["Dashboard"], role);

    for (const path of ["/", "/sales-processing", "/order-management", "/product-management/new", "/stock-management", "/manager/reports"]) {
      expect(await visit(path)).toBe("pass");
    }
    expect(await forwardedModules("/stock-management")).toEqual(ALL);
  });

  it("still sends a Super Admin who holds no Module to no-access", async () => {
    await signInAda([], "Super Admin");

    expect(await visit("/sales-processing")).toBe("/no-access");
  });

  it("lands on the first allowed page in sidebar order when the asked-for Module is missing", async () => {
    await signInAda(["Stock Management", "Sales Reports"]);

    expect(await visit("/order-management")).toBe("/stock-management");
  });

  it("lands on no-access when no Module is granted", async () => {
    await signInAda([]);

    expect(await visit("/sales-processing")).toBe("/no-access");
  });

  it("denies on the next request once a Module is revoked", async () => {
    await signInAda(["Dashboard", "Sales Processing"]);
    expect(await visit("/sales-processing")).toBe("pass");

    portal.revoke("ada", "Sales Processing");

    expect(await visit("/sales-processing")).toBe("/");
  });

  it("denies a deleted Staff member everywhere", async () => {
    await signInAda(ALL);
    portal.remove("ada");

    expect(await visit("/")).toBe("/no-access");
    expect(await visit("/stock-management")).toBe("/no-access");
  });

  it("sends Staff without a session to sign in, remembering the page", async () => {
    await signInAda(ALL);

    expect(await visit("/stock-management?tab=low", false)).toBe(
      "/api/portal/login?returnTo=%2Fstock-management%3Ftab%3Dlow",
    );
  });

  it("sends Staff whose session ended to sign in", async () => {
    await signInAda(ALL);
    portal.signOut();

    expect(await visit("/order-management")).toBe("/api/portal/login?returnTo=%2Forder-management");
  });

  it("shows unavailable when the Enterprise Portal answers 503", async () => {
    await signInAda(ALL);
    portal.unavailable = true;

    expect(await visit("/")).toBe("/unavailable?returnTo=%2F");
  });

  it("shows unavailable when the Enterprise Portal cannot be reached", async () => {
    await signInAda(ALL);
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });

    expect(await visit("/")).toBe("/unavailable?returnTo=%2F");
  });

  it("shows unavailable when the Enterprise Portal fails while looking for another page", async () => {
    await signInAda(["Stock Management"]);
    const working = fetch;
    let calls = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (++calls > 1) throw new Error("network down");
      return working(input, init);
    });

    expect(await visit("/order-management")).toBe("/unavailable?returnTo=%2Forder-management");
  });

  it.each(["/no-access", "/unavailable", "/sign-in-error", "/signing-in", "/api/portal/login", "/api/portal/logout", "/api-pos/orders", "/api/my-locations"])(
    "does not guard %s",
    async (path) => {
      await signInAda([]);

      expect(await visit(path, false)).toBe("pass");
    },
  );
});
