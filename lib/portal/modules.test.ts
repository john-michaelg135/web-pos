import { describe, expect, it } from "vitest";

import {
  firstModulePathForRole,
  modulesForRole,
  mayPerformAction,
  roleMayUseModule,
} from "./modules";

describe("POS role access", () => {
  it("limits Cashiers to sales and request-only order management", () => {
    expect(modulesForRole("Cashier")).toEqual(["Sales Processing", "Order Management"]);
    expect(roleMayUseModule("Cashier", "Product Management")).toBe(false);
    expect(mayPerformAction("Cashier", "Order Management", "write")).toBe(true);
    expect(mayPerformAction("Cashier", "Order Management", "approve")).toBe(false);
    expect(mayPerformAction("Cashier", "Order Management", "update")).toBe(false);
  });

  it("gives POS Managers branch modules and refund/void approval actions", () => {
    for (const module of [
      "Sales Processing",
      "Order Management",
      "Product Management",
      "Stock Management",
      "Sales Reports",
    ]) {
      expect(roleMayUseModule("POS Manager", module)).toBe(true);
    }

    expect(roleMayUseModule("POS Manager", "Dashboard")).toBe(false);
    expect(roleMayUseModule("POS Manager", "Location Management")).toBe(false);
    expect(mayPerformAction("POS Manager", "Order Management", "approve")).toBe(true);
    expect(mayPerformAction("POS Manager", "Product Management", "update")).toBe(true);
  });

  it("gives administrators all modules and routes", () => {
    expect(modulesForRole("Super Admin")).toHaveLength(7);
    expect(roleMayUseModule("CEO", "Dashboard")).toBe(true);
    expect(mayPerformAction("Super Admin", "Order Management", "approve")).toBe(true);
    expect(firstModulePathForRole("Cashier")).toBe("/sales-processing");
    expect(firstModulePathForRole("POS Manager")).toBe("/sales-processing");
  });

  it("fails closed for unknown POS roles", () => {
    expect(modulesForRole("Staff/Employee")).toEqual([]);
    expect(mayPerformAction("Staff/Employee", "Sales Processing", "read")).toBe(false);
  });
});
