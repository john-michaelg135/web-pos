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
    data: [
      ...Array.from({ length: 9 }, (_, i) => ({ orderId: i + 1, orderType: "Store", orderStatus: i === 8 ? "Shipped" : "Processing" })),
      ...["Refund Requested", "Refunded", "Void Requested", "Voided"].map((orderStatus, i) => ({
        orderId: 10 + i, orderType: "Store", orderStatus,
      })),
    ],
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

it.each([["Active", "Shipped", 9], ["Refunds", "Refunded", 11], ["Voids", "Voided", 13]] as const)(
  "%s starts with all statuses and can filter and clear from the footer",
  async (tab, status, id) => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    render(<ViewOrderManagement />);
    await screen.findByText("Order 1");
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(tab) }));
    const total = tab === "Active" ? 9 : 2;
    expect(screen.getByText(new RegExp("Showing .* of " + total))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All statuses" }));
    fireEvent.click(screen.getByRole("button", { name: status + " (1)" }));
    expect(screen.getByText("Order " + id)).toBeTruthy();
    expect(screen.getByText(/Showing .* of 1$/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: status + " (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "All statuses" }));
    expect(screen.getByText(new RegExp("Showing .* of " + total))).toBeTruthy();
  },
);
