import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { creomsSalesToken, readOnlineSales } from "@/lib/creoms/online-sales";

const secret = "pos-creoms-secret-at-least-thirty-two-chars";
const feed = {
  from: "2026-11-01", to: "2026-11-30", timeZone: "Asia/Manila", currency: "PHP", sales: 15000, orders: 1,
  products: [{ imsProductId: 22, productName: "Ube Halaya", sizeLabel: "500g", unitsSold: 2, sales: 10000 }], otherSales: 5000,
};
const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());

beforeEach(() => { vi.stubEnv("POS_CREOMS_SECRET", secret); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("CREOMS sales token", () => {
  it("is an HS256 token for the online sales feed only, valid for five minutes", () => {
    const [header, payload, signature] = creomsSalesToken(secret, 1_764_000_000_000).split(".");
    expect(decode(header)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decode(payload)).toEqual({ iss: "pos", aud: "creoms-sales", scope: "sales:read", iat: 1_764_000_000, exp: 1_764_000_300 });
    expect(signature).toBe(createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url"));
  });
});

describe("Reading online sales from CREOMS", () => {
  it("asks CREOMS for the days with a signed token and returns the figures", async () => {
    vi.stubEnv("CREOMS_URL", "https://creoms.test/");
    const fetcher = vi.fn(async () => Response.json(feed));
    const result = await readOnlineSales("2026-11-01", "2026-11-30", fetcher as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, data: { from: "2026-11-01", to: "2026-11-30", sales: 15000, orders: 1, products: feed.products, otherSales: 5000 } });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://creoms.test/api/internal/pos-sales?from=2026-11-01&to=2026-11-30");
    const token = String((init.headers as Record<string, string>).Authorization).replace("Bearer ", "");
    expect(decode(token.split(".")[1])).toMatchObject({ iss: "pos", aud: "creoms-sales", scope: "sales:read" });
    expect(init.cache).toBe("no-store");
  });

  it("defaults to the production CREOMS", async () => {
    const fetcher = vi.fn(async () => Response.json(feed));
    await readOnlineSales("2026-11-01", "2026-11-30", fetcher as unknown as typeof fetch);
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toMatch(/^https:\/\/creoms\.buildwrite\.me\/api\/internal\/pos-sales\?/);
  });

  it("refuses bad days without calling CREOMS, and passes on CREOMS's refusal of a range", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "range" }), { status: 400 }));
    for (const [from, to] of [["", "2026-11-30"], ["2026-11-1", "2026-11-30"], ["2026-11-30", "2026-11-01"]]) {
      expect(await readOnlineSales(from, to, fetcher as unknown as typeof fetch)).toEqual({ ok: false, reason: "range" });
    }
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readOnlineSales("2024-01-01", "2026-11-30", fetcher as unknown as typeof fetch)).toEqual({ ok: false, reason: "range" });
  });

  it("never follows CREOMS's sign-in redirect, and says why it is unavailable", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 307, headers: { location: "https://creoms.test/signing-in" } }));
    expect(await readOnlineSales("2026-11-01", "2026-11-30", fetcher as unknown as typeof fetch)).toEqual({ ok: false, reason: "unavailable" });
    expect(((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]).redirect).toBe("manual");
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toMatch(/redirected .*\/api\/internal\/pos-sales/);
  });

  it("is unavailable when the secret is unset, CREOMS refuses the token or is down, or the network fails", async () => {
    for (const status of [401, 503]) {
      const fetcher = vi.fn(async () => new Response(null, { status }));
      expect(await readOnlineSales("2026-11-01", "2026-11-30", fetcher as unknown as typeof fetch), String(status)).toEqual({ ok: false, reason: "unavailable" });
    }
    const offline = vi.fn(async () => { throw new TypeError("fetch failed"); });
    expect(await readOnlineSales("2026-11-01", "2026-11-30", offline as unknown as typeof fetch)).toEqual({ ok: false, reason: "unavailable" });
    vi.stubEnv("POS_CREOMS_SECRET", "short");
    const never = vi.fn();
    expect(await readOnlineSales("2026-11-01", "2026-11-30", never as unknown as typeof fetch)).toEqual({ ok: false, reason: "unavailable" });
    expect(never).not.toHaveBeenCalled();
  });
});
