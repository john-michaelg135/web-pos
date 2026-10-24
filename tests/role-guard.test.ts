import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guard } from "@/lib/portal/guard";
import { FAKE_PORTAL_URL, FAKE_SECRET, FAKE_SYSTEM, FakePortal, portalFetch } from "./fake-portal";

const APP = "https://localhost:3002";
const staffWith = (role: string) => ({
  name: "Ada Okafor",
  username: "ada.okafor",
  email: "ada@brenraphaels.test",
  role,
});

let portal: FakePortal;

let handle: string;

async function signInAda(role: string, modules: string[] = ["Dashboard"]) {
  portal = new FakePortal();
  portal.addStaff("ada", staffWith(role), modules);
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


const STARTING_CASH = "/manager/starting-cash";
const LOCATIONS = "/admin/locations";

describe("role guard", () => {
  it.each([
    ["Cashier", STARTING_CASH, true],
    ["Manager", STARTING_CASH, true],
    ["Super Admin", STARTING_CASH, true],
    ["CEO", STARTING_CASH, true],
    ["Stock Clerk", STARTING_CASH, false],
    ["Cashier", LOCATIONS, false],
    ["Manager", LOCATIONS, true],
    ["Super Admin", LOCATIONS, true],
    ["CEO", LOCATIONS, true],
    ["Stock Clerk", LOCATIONS, false],
  ])("%s opening %s: allowed=%s", async (role, path, allowed) => {
    await signInAda(role);

    expect(await visit(path)).toBe(allowed ? "pass" : "/no-access");
    expect(await visit(`${path}/anything`)).toBe(allowed ? "pass" : "/no-access");
  });

  it("finds the Role through any Module the Staff member holds", async () => {
    await signInAda("Manager", ["Stock Management"]);

    expect(await visit(LOCATIONS)).toBe("pass");
  });

  it("denies Staff who hold no Module, since the Enterprise Portal returns no Role", async () => {
    await signInAda("Manager", []);

    expect(await visit(LOCATIONS)).toBe("/no-access");
  });

  it("denies a deleted Staff member", async () => {
    await signInAda("Manager");
    portal.remove("ada");

    expect(await visit(LOCATIONS)).toBe("/no-access");
  });

  it("sends Staff without a session to sign in, remembering the page", async () => {
    await signInAda("Manager");

    expect(await visit(LOCATIONS, false)).toBe("/api/portal/login?returnTo=%2Fadmin%2Flocations");
  });

  it("sends Staff whose session ended to sign in", async () => {
    await signInAda("Manager");
    portal.signOut();

    expect(await visit(STARTING_CASH)).toBe("/api/portal/login?returnTo=%2Fmanager%2Fstarting-cash");
  });

  it("shows unavailable when the Enterprise Portal answers 503", async () => {
    await signInAda("Manager");
    portal.unavailable = true;

    expect(await visit(LOCATIONS)).toBe("/unavailable");
  });
});
