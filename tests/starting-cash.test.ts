import { describe, expect, it } from "vitest";
import { startingCashRule } from "@/lib/portal/roles";

describe("starting cash rule by Role", () => {
  it.each(["Cashier", "Manager"])("%s must declare starting cash", (role) => {
    expect(startingCashRule(role)).toBe("mandatory");
  });

  it.each(["Super Admin", "CEO"])("%s is never prompted", (role) => {
    expect(startingCashRule(role)).toBe("exempt");
  });

  it.each(["Janitor", "", undefined])("unknown Role %j behaves like Cashier", (role) => {
    expect(startingCashRule(role)).toBe("mandatory");
  });
});
