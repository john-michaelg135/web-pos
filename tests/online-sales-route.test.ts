import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  check: { decision: "allowed", staff: { role: "Manager" } } as { decision: string; staff?: { role: string } },
  role: { decision: "denied" } as { decision: string; role?: string },
  result: { ok: true, data: { sales: 1 } } as unknown,
  reads: [] as string[][],
}));
vi.mock("@/lib/portal/access", () => ({
  accessFor: () => ({ check: async () => state.check, role: async () => state.role }),
}));
vi.mock("@/lib/creoms/online-sales", () => ({
  readOnlineSales: async (from: string, to: string) => { state.reads.push([from, to]); return state.result; },
}));

import { GET } from "@/app/api/creoms/online-sales/route";

const get = () => GET(new NextRequest("https://pos.test/api/creoms/online-sales?from=2026-11-01&to=2026-11-30"));

beforeEach(() => {
  state.check = { decision: "allowed", staff: { role: "Manager" } };
  state.role = { decision: "denied" };
  state.result = { ok: true, data: { sales: 1 } };
  state.reads = [];
});

describe("Online sales route", () => {
  it("gives Staff with Sales Reports the online sales, never cached", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ sales: 1 });
    expect(state.reads).toEqual([["2026-11-01", "2026-11-30"]]);
  });

  it("lets Admin and CEO in without the grant", async () => {
    state.check = { decision: "denied" };
    state.role = { decision: "allowed", role: "CEO" };
    expect((await get()).status).toBe(200);
  });

  it("refuses Staff without Sales Reports, a Role that may not use it, and a signed-out browser", async () => {
    state.check = { decision: "denied" };
    state.role = { decision: "allowed", role: "Cashier" };
    expect((await get()).status).toBe(403);
    state.check = { decision: "allowed", staff: { role: "Cashier" } };
    expect((await get()).status).toBe(403);
    state.check = { decision: "invalid" };
    expect((await get()).status).toBe(401);
    expect(state.reads).toEqual([]);
  });

  it("says why when CREOMS refuses the range or is unavailable", async () => {
    state.result = { ok: false, reason: "range" };
    const range = await get();
    expect(range.status).toBe(400);
    expect((await range.json()).message).toBe("Pick a period of at most a year.");
    state.result = { ok: false, reason: "unavailable" };
    const down = await get();
    expect(down.status).toBe(503);
    expect((await down.json()).message).toBe("Online sales are unavailable right now.");
  });
});
