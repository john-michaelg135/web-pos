import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAKE_CALLBACK,
  FAKE_PORTAL_URL,
  FAKE_SECRET,
  FAKE_SYSTEM,
  FakePortal,
  portalFetch,
} from "./fake-portal";

const ada = {
  name: "Ada Okafor",
  username: "ada.okafor",
  email: "ada@brenraphaels.test",
  role: "Cashier",
};
const VERIFIER = "v".repeat(43);

let portal: FakePortal;

beforeEach(() => {
  portal = new FakePortal();
  vi.stubGlobal("fetch", portalFetch(portal));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const post = (path: string, body: unknown, secret = FAKE_SECRET) =>
  fetch(`${FAKE_PORTAL_URL}${path}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${FAKE_SYSTEM}:${secret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

/** Runs authorize then exchange over HTTP and returns the opaque handle. */
async function handoff(): Promise<string> {
  const authorize = new URL(`${FAKE_PORTAL_URL}/api/integrations/authorize`);
  authorize.search = new URLSearchParams({
    system: FAKE_SYSTEM,
    redirect_uri: FAKE_CALLBACK,
    state: "s",
    code_challenge: createHash("sha256").update(VERIFIER).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();

  const granted = new URL((await fetch(authorize, { redirect: "manual" })).headers.get("location")!);
  const exchange = await post("/api/integrations/exchange", {
    code: granted.searchParams.get("code"),
    state: "s",
    code_verifier: VERIFIER,
    redirect_uri: FAKE_CALLBACK,
  });

  return (await exchange.json()).handle;
}

const validate = (handle: string, module: string) =>
  post("/api/integrations/validate", { handle, module });

describe("fake Enterprise Portal", () => {
  beforeEach(() => {
    portal.addStaff("ada", ada, ["Dashboard", "Sales Processing"]);
    portal.signIn("ada");
  });

  it("signs Staff in and returns their profile for a granted Module", async () => {
    const handle = await handoff();

    const response = await validate(handle, "Dashboard");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ active: true, staff: ada });
  });

  it("denies a Module that was never granted, and one that is revoked", async () => {
    const handle = await handoff();

    expect((await validate(handle, "Sales Reports")).status).toBe(403);

    portal.revoke("ada", "Sales Processing");
    expect((await validate(handle, "Sales Processing")).status).toBe(403);

    portal.grant("ada", "Sales Processing");
    expect((await validate(handle, "Sales Processing")).status).toBe(200);
  });

  it("denies every Module once the Staff member is deleted", async () => {
    const handle = await handoff();

    portal.remove("ada");

    expect((await validate(handle, "Dashboard")).status).toBe(403);
  });

  it("answers 503 while unreachable and recovers", async () => {
    const handle = await handoff();

    portal.unavailable = true;
    expect((await validate(handle, "Dashboard")).status).toBe(503);

    portal.unavailable = false;
    expect((await validate(handle, "Dashboard")).status).toBe(200);
  });

  it("invalidates the handle after central logout", async () => {
    const handle = await handoff();

    await fetch(`${FAKE_PORTAL_URL}/logout`, { redirect: "manual" });

    expect((await validate(handle, "Dashboard")).status).toBe(401);
  });

  it("spends a code once and rejects a wrong PKCE proof", async () => {
    const authorize = new URL(`${FAKE_PORTAL_URL}/api/integrations/authorize`);
    authorize.search = new URLSearchParams({
      system: FAKE_SYSTEM,
      redirect_uri: FAKE_CALLBACK,
      state: "s",
      code_challenge: createHash("sha256").update(VERIFIER).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    const code = new URL((await fetch(authorize, { redirect: "manual" })).headers.get("location")!)
      .searchParams.get("code");
    const exchange = (verifier: string) =>
      post("/api/integrations/exchange", {
        code,
        state: "s",
        code_verifier: verifier,
        redirect_uri: FAKE_CALLBACK,
      });

    expect((await exchange("x".repeat(43))).status).toBe(400);
    expect((await exchange(VERIFIER)).status).toBe(400);
  });
});
