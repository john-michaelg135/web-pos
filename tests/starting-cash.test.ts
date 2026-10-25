import { describe, expect, it } from "vitest";
import { startingCashRule } from "@/lib/portal/roles";

describe("starting cash rule by Role", () => {
  it.each(["Cashier", "Janitor", "", undefined])("%s must declare starting cash", (role) => {
    expect(startingCashRule(role)).toBe("mandatory");
  });

  it.each(["Manager", "POS Manager"])("%s is prompted but may skip starting cash", (role) => {
    expect(startingCashRule(role)).toBe("optional");
  });

  it.each(["Super Admin", "CEO"])("%s is exempt from the starting cash prompt", (role) => {
    expect(startingCashRule(role)).toBe("exempt");
  });
});
