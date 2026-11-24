// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PriceHistoryTable } from "@/components/module-pos/PriceHistory";

vi.mock("@/components/module-pos/api", () => ({ apiClient: {} }));

it("matches the displayed Manila date and price, including multi-word queries", () => {
  render(<PriceHistoryTable products={[]} isLoading={false} error={null} changes={[{
    priceId: 1, productId: 2, productName: "Ube Jam Tidbits", variationId: 3,
    variationName: "Jar|500g", effectiveFrom: "2026-05-31T16:30:00Z",
    price: 449, isCurrent: true,
  }]} />);
  const input = screen.getByRole("textbox", { name: "Search price history" });
  for (const query of ["Jun", "449", "price 449", "Jun ₱449.00"]) {
    fireEvent.change(input, { target: { value: query } });
    expect(screen.getByRole("cell", { name: /Ube Jam Tidbits/ })).toBeTruthy();
  }
  fireEvent.change(input, { target: { value: "price 999" } });
  expect(screen.getByText("No price changes found.")).toBeTruthy();
});
