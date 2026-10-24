import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guard } from "@/lib/portal/guard";
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
];

let portal: FakePortal;

let handle: string;

async function signInAda(modules: string[]) {
  portal = new FakePortal();
  portal.addStaff("ada", ada, modules);
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
  it.each([
    ["/", "Dashboard"],
    ["/sales-processing", "Sales Processing"],
    ["/order-management", "Order Management"],
    ["/product-management", "Product Management"],
    ["/stock-management", "Stock Management"],
    ["/manager/reports", "Sales Reports"],
  ])("opens %s only with the %s Module, and its child paths follow", async (path, module) => {
    await signInAda([module]);
    expect(await visit(path)).toBe("pass");
    if (path !== "/") expect(await visit(`${path}/details/1`)).toBe("pass");

    await signInAda(ALL.filter((m) => m !== module));
    expect(await visit(path)).not.toBe("pass");
    if (path !== "/") expect(await visit(`${path}/details/1`)).not.toBe("pass");
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

  it("fails closed for a page that belongs to no Module until its Role guard exists", async () => {
    await signInAda(ALL);

    expect(await visit("/manager/starting-cash")).toBe("/no-access");
    expect(await visit("/admin/locations")).toBe("/no-access");
  });
});
