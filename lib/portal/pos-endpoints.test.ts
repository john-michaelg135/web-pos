import { describe, expect, it } from "vitest";

import { isAllowedPosEndpoint } from "./pos-endpoints";

describe("POS proxy allowlist", () => {
  it("lets the bell read its feed and unread count", () => {
    expect(isAllowedPosEndpoint("GET", "notifications")).toBe(true);
    expect(isAllowedPosEndpoint("GET", "notifications/unread-count")).toBe(true);
  });

  it("lets the bell mark alerts read and ask for a live ticket", () => {
    expect(isAllowedPosEndpoint("POST", "notifications/42/read")).toBe(true);
    expect(isAllowedPosEndpoint("POST", "notifications/read-all")).toBe(true);
    expect(isAllowedPosEndpoint("POST", "notifications/live-ticket")).toBe(true);
  });

  it("rejects other bell shapes and methods", () => {
    expect(isAllowedPosEndpoint("GET", "notifications/42/read")).toBe(false);
    expect(isAllowedPosEndpoint("PUT", "notifications/read-all")).toBe(false);
    expect(isAllowedPosEndpoint("POST", "notifications")).toBe(false);
    expect(isAllowedPosEndpoint("POST", "notifications/abc/read")).toBe(false);
    expect(isAllowedPosEndpoint("POST", "notifications/42/read/extra")).toBe(false);
    expect(isAllowedPosEndpoint("GET", "notifications/../locations/staff")).toBe(false);
  });

  it("keeps the existing order routes", () => {
    expect(isAllowedPosEndpoint("GET", "user-pin")).toBe(true);
    expect(isAllowedPosEndpoint("PUT", "order-management/orders/7/approve-refund")).toBe(true);
    expect(isAllowedPosEndpoint("POST", "order-management/orders/7/proof-uploads/refund/confirm")).toBe(true);
  });
});
