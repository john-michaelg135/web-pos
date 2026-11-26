// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SalesReportPageSkeleton } from "@/components/shared/PageSkeleton";
import { StaffProvider } from "@/context/AuthContext";

afterEach(cleanup);

const skeletonTabs = (role: string) => {
  render(
    <StaffProvider staff={{ name: "Test", username: "test", email: "test@pos.test", role }} modules={["Sales Reports", "Order Management"]}>
      <SalesReportPageSkeleton />
    </StaffProvider>,
  );
  return ["Sales Report", "Money Audit", "Online Sales"].filter((label) => screen.queryAllByText(label).some((el) => el.closest("[data-state]")));
};

describe("Sales Report loading skeleton tabs", () => {
  it("shows the Online Sales tab while loading for the General Manager and the Owner", () => {
    expect(skeletonTabs("General Manager")).toEqual(["Sales Report", "Money Audit", "Online Sales"]);
    cleanup();
    expect(skeletonTabs("CEO")).toEqual(["Sales Report", "Money Audit", "Online Sales"]);
  });

  it("never shows the Online Sales tab to branch Managers", () => {
    expect(skeletonTabs("Manager")).toEqual(["Sales Report", "Money Audit"]);
    cleanup();
    expect(skeletonTabs("POS Manager")).toEqual(["Sales Report", "Money Audit"]);
  });
});
