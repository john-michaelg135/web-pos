import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";
import { accessFor } from "@/lib/portal/access";
import { DEV_STAFF, devBypassEnabled } from "@/lib/portal/dev-bypass";

afterEach(() => vi.unstubAllEnvs());

const on = { POS_DEV_BYPASS: "true" } as const;

describe("dev bypass", () => {
  it("is off unless explicitly switched on", () => {
    expect(devBypassEnabled({})).toBe(false);
    expect(devBypassEnabled({ POS_DEV_BYPASS: "false" })).toBe(false);
  });

  it("is on outside production for a local origin", () => {
    expect(devBypassEnabled({ ...on, NODE_ENV: "development" })).toBe(true);
    expect(
      devBypassEnabled({ ...on, NODE_ENV: "test", POS_APP_URL: "https://localhost:3002" }),
    ).toBe(true);
  });

  it("refuses to start in production", () => {
    expect(() => devBypassEnabled({ ...on, NODE_ENV: "production" })).toThrow(/production/);
  });

  it("refuses to start with a deployed origin configured", () => {
    expect(() =>
      devBypassEnabled({
        ...on,
        NODE_ENV: "development",
        POS_APP_URL: "https://web-pos-echoez.vercel.app",
      }),
    ).toThrow(/POS_APP_URL/);
  });

  it("refuses to start on a Vercel deployment", () => {
    expect(() =>
      devBypassEnabled({ ...on, NODE_ENV: "development", VERCEL_ENV: "preview" }),
    ).toThrow(/Vercel/);
  });

  it("stops the server from starting when the environment is unsafe", async () => {
    vi.stubEnv("POS_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");

    await expect(register()).rejects.toThrow(/production/);
  });

  it("allows every Module for the fixed Staff member, with no session and no Enterprise Portal", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const access = accessFor(undefined, { bypass: true });

    for (const module of ["Dashboard", "Sales Processing", "Sales Report Analytics"]) {
      expect(await access.check(module)).toEqual({ decision: "allowed", staff: DEV_STAFF });
    }
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("reads the switch from the environment by default", async () => {
    vi.stubEnv("POS_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");

    expect(await accessFor(undefined).check("Dashboard")).toMatchObject({ decision: "allowed" });
  });
});
