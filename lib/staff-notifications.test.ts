import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BellUnavailableError,
  alertTime,
  listAlerts,
  liveTicketUrl,
  mergeAlerts,
  reconnectDelay,
  safeAlertLink,
  type StaffAlert,
} from "./staff-notifications";

afterEach(() => vi.unstubAllGlobals());

const alert = (id: number, read = false): StaffAlert => ({
  id,
  kind: "pos.refund-requested",
  module: "Order Management",
  title: "Refund requested",
  body: "",
  link: `/order-management?orderId=${id}`,
  locationId: 8,
  orderId: id,
  transferId: null,
  variationId: null,
  partial: false,
  createdAt: "2026-11-21T00:00:00Z",
  read,
});

describe("staff bell helpers", () => {
  it("follows only same-site POS paths", () => {
    expect(safeAlertLink("/order-management?orderId=5")).toBe("/order-management?orderId=5");
    expect(safeAlertLink("https://evil.example/x")).toBeNull();
    expect(safeAlertLink("//evil.example/x")).toBeNull();
    expect(safeAlertLink("/\\evil.example")).toBeNull();
    expect(safeAlertLink("")).toBeNull();
  });

  it("shows when an alert was made in Philippine time", () => {
    expect(alertTime("2026-11-25T16:26:48Z")).toBe("11/26/2026, 12:26:48 AM");
    expect(alertTime("not a date")).toBe("");
  });

  it("merges a refreshed page newest first, preferring fresh state", () => {
    const merged = mergeAlerts([alert(3), alert(1)], [alert(4), alert(3, true)]);
    expect(merged.map((a) => [a.id, a.read])).toEqual([[4, false], [3, true], [1, false]]);
  });

  it("backs off live reconnects up to a minute", () => {
    expect(reconnectDelay(0)).toBe(2_000);
    expect(reconnectDelay(3)).toBe(16_000);
    expect(reconnectDelay(10)).toBe(60_000);
  });
});

describe("staff bell requests", () => {
  it("pages through the same-origin proxy without caching", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null, unread: 0 }));
    vi.stubGlobal("fetch", fetch);

    await listAlerts("41", 20);

    expect(fetch).toHaveBeenCalledWith(
      "/api/pos/notifications?limit=20&cursor=41",
      expect.objectContaining({ method: "GET", cache: "no-store", credentials: "same-origin" }),
    );
  });

  it("treats a missing session or Module as an unavailable bell", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    await expect(listAlerts()).rejects.toBeInstanceOf(BellUnavailableError);
  });

  it("falls back to polling when live updates are off", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "off" }, { status: 503 })));
    await expect(liveTicketUrl()).resolves.toBeNull();
  });

  it("accepts only a WebSocket address for live updates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ url: "https://gw.example/x" })));
    await expect(liveTicketUrl()).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ url: "wss://gw.example/notifications/live?ticket=t" })));
    await expect(liveTicketUrl()).resolves.toBe("wss://gw.example/notifications/live?ticket=t");
  });
});
