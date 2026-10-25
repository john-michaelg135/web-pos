import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guard } from "@/lib/portal/guard";
import { MODULE_HEADER, STAFF_HEADER, staffFromHeaders } from "@/lib/portal/staff-header";
import { MODULES } from "@/lib/portal/modules";
import { canUse, isManager, isSuperUser } from "@/lib/portal/roles";

const ada = { name: "Ada Okafor", username: "ada.okafor", email: "ada@brenraphaels.test", role: "Manager" };

describe("can()", () => {
  it("is true for an allowed Module and false otherwise, whatever the action", () => {
    expect(canUse(["Order Management"], "Order Management")).toBe(true);
    expect(canUse(["Order Management"], "Stock Management")).toBe(false);
    expect(canUse([], "Order Management")).toBe(false);
  });
});

describe("Role-name checks", () => {
  it("reads Manager and Super Admin from the Enterprise Portal role", () => {
    expect(isManager("Manager")).toBe(true);
    expect(isManager("POS Manager")).toBe(true);
    expect(isManager("Cashier")).toBe(false);
    expect(isSuperUser("Super Admin")).toBe(true);
    expect(isSuperUser("CEO")).toBe(true);
    expect(isSuperUser("Manager")).toBe(false);
  });
});

describe("Staff forwarded by the guard", () => {
  beforeEach(() => {
    vi.stubEnv("POS_DEV_BYPASS", "true");
    vi.stubEnv("POS_APP_URL", "https://localhost:3002");
  });
  afterEach(() => vi.unstubAllEnvs());

  const forwarded = (response: Response, name: string) =>
    response.headers.get(`x-middleware-request-${name}`);

  it("hands the validated Staff and every Module they may open to the page", async () => {
    const response = await guard(new NextRequest("https://localhost:3002/order-management"));
    const seen = new Headers({
      [STAFF_HEADER]: forwarded(response, STAFF_HEADER) ?? "",
      [MODULE_HEADER]: forwarded(response, MODULE_HEADER) ?? "",
    });

    expect(staffFromHeaders(seen)).toEqual({
      staff: expect.objectContaining({ username: "dev.staff" }),
      modules: MODULES.map((m) => m.name),
    });
  });

  it("drops a Staff header the browser sent on a page it does not validate", async () => {
    const response = await guard(
      new NextRequest("https://localhost:3002/no-access", {
        headers: { [STAFF_HEADER]: "forged", [MODULE_HEADER]: "Dashboard" },
      }),
    );

    expect(forwarded(response, STAFF_HEADER)).toBeNull();
    expect(response.headers.get("x-middleware-override-headers")).not.toContain(STAFF_HEADER);
  });
});

describe("staffFromHeaders", () => {
  it("round-trips non-ASCII names and rejects junk", async () => {
    const { encodeStaff } = await import("@/lib/portal/staff-header");
    const headers = new Headers({ [STAFF_HEADER]: encodeStaff({ ...ada, name: "Zoë Ñandú" }), [MODULE_HEADER]: "Dashboard" });

    expect(staffFromHeaders(headers)?.staff.name).toBe("Zoë Ñandú");
    expect(staffFromHeaders(new Headers({ [STAFF_HEADER]: "%%%" }))).toBeNull();
    expect(staffFromHeaders(new Headers())).toBeNull();
  });
});
