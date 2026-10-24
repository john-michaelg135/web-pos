import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "@/app/api/portal/callback/route";
import { GET as login } from "@/app/api/portal/login/route";
import { POST as logout } from "@/app/api/portal/logout/route";
import {
  FAKE_PORTAL_URL,
  FAKE_SECRET,
  FAKE_SYSTEM,
  FakePortal,
  portalFetch,
} from "./fake-portal";

const APP = "https://localhost:3002";
const ada = {
  name: "Ada Okafor",
  username: "ada.okafor",
  email: "ada@brenraphaels.test",
  role: "Cashier",
};

let portal: FakePortal;

beforeEach(() => {
  portal = new FakePortal();
  portal.addStaff("ada", ada, ["Dashboard"]);
  portal.signIn("ada");
  vi.stubGlobal("fetch", portalFetch(portal));
  vi.stubEnv("PORTAL_URL", FAKE_PORTAL_URL);
  vi.stubEnv("PORTAL_SYSTEM_NAME", FAKE_SYSTEM);
  vi.stubEnv("PORTAL_SYSTEM_SECRET", FAKE_SECRET);
  vi.stubEnv("POS_APP_URL", APP);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const request = (path: string, init?: { method?: string; cookie?: string }) =>
  new NextRequest(`${APP}${path}`, {
    method: init?.method,
    headers: init?.cookie ? { cookie: init.cookie } : undefined,
  });

const cookieOf = (response: Response, name: string) => {
  const header = response.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${name}=`));

  return header ? { raw: header, value: header.split(";")[0].slice(name.length + 1) } : undefined;
};

/** Starts sign-in, lets the fake Enterprise Portal authorize, and returns the callback request. */
async function startSignIn(returnTo?: string) {
  const started = await login(
    request(`/api/portal/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`),
  );
  const authorized = await fetch(started.headers.get("location")!, { redirect: "manual" });
  const granted = new URL(authorized.headers.get("location")!);
  const handoff = cookieOf(started, "pos_handoff")!;

  return {
    started,
    callbackUrl: `${granted.pathname}${granted.search}`,
    handoffCookie: `pos_handoff=${handoff.value}`,
  };
}

describe("signing in", () => {
  it("completes the handoff and keeps only the opaque handle in an httpOnly cookie", async () => {
    const { callbackUrl, handoffCookie } = await startSignIn();

    const response = await callback(request(callbackUrl, { cookie: handoffCookie }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    const session = cookieOf(response, "pos_session")!;
    expect(session.raw).toMatch(/HttpOnly/i);
    expect(session.value).not.toContain(ada.name);
    expect(session.value).not.toContain(ada.email);
    expect(session.raw).not.toContain(FAKE_SECRET);
  });

  it("sends the browser to the Enterprise Portal with state and a PKCE challenge, never the secret", async () => {
    const started = await login(request("/api/portal/login"));
    const authorize = new URL(started.headers.get("location")!);

    expect(authorize.origin).toBe(FAKE_PORTAL_URL);
    expect(authorize.searchParams.get("system")).toBe("POS");
    expect(authorize.searchParams.get("state")).toBeTruthy();
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorize.toString()).not.toContain(FAKE_SECRET);
  });

  it("returns Staff to the page they originally asked for", async () => {
    const { callbackUrl, handoffCookie } = await startSignIn("/orders?tab=open");

    const response = await callback(request(callbackUrl, { cookie: handoffCookie }));

    const location = new URL(response.headers.get("location")!);
    expect(`${location.pathname}${location.search}`).toBe("/orders?tab=open");
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example", "/api/portal/login"])(
    "ignores the unsafe return target %s",
    async (target) => {
      const { callbackUrl, handoffCookie } = await startSignIn(target);

      const response = await callback(request(callbackUrl, { cookie: handoffCookie }));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    },
  );

  it("ends on the sign-in error when the state does not match", async () => {
    const { callbackUrl, handoffCookie } = await startSignIn();
    const url = new URL(`${APP}${callbackUrl}`);
    url.searchParams.set("state", "tampered");

    const response = await callback(
      request(`${url.pathname}${url.search}`, { cookie: handoffCookie }),
    );

    expect(response.headers.get("location")).toBe(`${APP}/sign-in-error?reason=failed`);
    expect(cookieOf(response, "pos_session")?.value ?? "").toBe("");
  });

  it("ends on the sign-in error when the handoff cookie or code is missing", async () => {
    const { callbackUrl } = await startSignIn();
    const noCookie = await callback(request(callbackUrl));
    const noCode = await callback(request("/api/portal/callback"));

    expect(noCookie.headers.get("location")).toBe(`${APP}/sign-in-error?reason=failed`);
    expect(noCode.headers.get("location")).toBe(`${APP}/sign-in-error?reason=failed`);
  });

  it("ends on the sign-in error when the exchange fails", async () => {
    const { callbackUrl, handoffCookie } = await startSignIn();
    portal.expireCodes();

    const response = await callback(request(callbackUrl, { cookie: handoffCookie }));

    expect(response.headers.get("location")).toBe(`${APP}/sign-in-error?reason=failed`);
    expect(cookieOf(response, "pos_session")?.value ?? "").toBe("");
  });

  it("reports denied when the Enterprise Portal denies the sign-in", async () => {
    const { handoffCookie } = await startSignIn();

    const response = await callback(
      request("/api/portal/callback?error=access_denied", { cookie: handoffCookie }),
    );

    expect(response.headers.get("location")).toBe(`${APP}/sign-in-error?reason=denied`);
  });

  it("reports unavailable when the Enterprise Portal cannot be reached", async () => {
    const { callbackUrl, handoffCookie } = await startSignIn();
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });

    const response = await callback(request(callbackUrl, { cookie: handoffCookie }));

    expect(response.headers.get("location")).toBe(`${APP}/sign-in-error?reason=unavailable`);
  });
});

describe("signing out", () => {
  it("clears the cookie and sends Staff to the Enterprise Portal's logout", async () => {
    const response = await logout();

    expect(response.headers.get("location")).toBe(`${FAKE_PORTAL_URL}/logout`);
    expect(cookieOf(response, "pos_session")?.raw).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("only works as a POST", async () => {
    const route = await import("@/app/api/portal/logout/route");

    expect(Object.keys(route)).not.toContain("GET");
    expect(Object.keys(route)).toContain("POST");
  });
});
