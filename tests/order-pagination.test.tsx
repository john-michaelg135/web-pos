// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ViewOrderManagement from "@/pages/pos/ViewOrderManagement";

vi.mock("next/navigation", () => ({ useRouter: () => ({}), useSearchParams: () => null }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: {}, can: () => true, canRead: () => true }) }));
vi.mock("@/lib/useMyLocations", () => ({ useMyLocations: () => ({ scope: "all", locations: [], isLoading: false }) }));
vi.mock("@/components/module-pos/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("@/components/module-pos/OrderCard", () => ({
  default: ({ order }: { order: { id: string } }) => <tr><td>Order {order.id}</td></tr>,
}));
vi.mock("@/components/module-pos/api", () => ({
  apiClient: { apiPos: { orderManagementOrdersList: async () => ({
    data: Array.from({ length: 9 }, (_, i) => ({ orderId: i + 1, orderType: "Store", orderStatus: "Processing" })),
  }) } },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("pages nine orders in both directions when only four rows fit", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("innerHeight", 720);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, this.tagName === "TR" ? 420 : 0, 100, 64);
  });
  render(<ViewOrderManagement />);
  await screen.findByText("Showing 1–4 of 9");
  const next = screen.getByRole("button", { name: "Next" });
  const previous = screen.getByRole("button", { name: "Previous" });
  expect(previous.hasAttribute("disabled")).toBe(true);
  fireEvent.click(next);
  expect(screen.getByText("Order 5")).toBeTruthy();
  fireEvent.click(next);
  expect(screen.getByText("Showing 9–9 of 9")).toBeTruthy();
  expect(next.hasAttribute("disabled")).toBe(true);
  fireEvent.click(previous);
  expect(screen.getByText("Showing 5–8 of 9")).toBeTruthy();
});
