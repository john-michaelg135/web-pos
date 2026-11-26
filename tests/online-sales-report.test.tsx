// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnlineSalesReport } from "@/components/module-pos/OnlineSalesReport";

const data = {
  from: "2026-11-01", to: "2026-11-30", sales: 2559550, orders: 3, otherSales: 12000,
  products: [
    { imsProductId: 22, productName: "Ube Halaya", sizeLabel: "500g", unitsSold: 40, sales: 1596000 },
    { imsProductId: null, productName: "Ube Jam", sizeLabel: "", unitsSold: 25, sales: 951550 },
  ],
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Online sales report", () => {
  it("shows a skeleton at once, then the overall figures and each product and size in pesos", async () => {
    const fetcher = vi.fn(async () => Response.json(data));
    vi.stubGlobal("fetch", fetcher);
    render(<OnlineSalesReport from="2026-11-01" to="2026-11-30" />);
    expect(screen.getByRole("status", { name: "Loading online sales" })).toBeTruthy();

    expect(await screen.findByText("Online sales")).toBeTruthy();
    expect(screen.getAllByText("₱25,595.50")).toHaveLength(2);
    expect(screen.getByText("65")).toBeTruthy();
    expect(screen.getByText("₱15,960.00")).toBeTruthy();
    expect(screen.getByText("500g")).toBeTruthy();
    expect(screen.getByText("₱120.00")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toBe("/api/creoms/online-sales?from=2026-11-01&to=2026-11-30");
  });

  it("says online sales are unavailable when CREOMS can't be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "x" }), { status: 503 })));
    render(<OnlineSalesReport from="2026-11-01" to="2026-11-30" />);
    expect(await screen.findByText("Online sales are unavailable right now.")).toBeTruthy();
  });

  it("explains a period that is too long", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "Pick a period of at most a year." }), { status: 400 })));
    render(<OnlineSalesReport from="2024-01-01" to="2026-11-30" />);
    expect(await screen.findByText("Pick a period of at most a year.")).toBeTruthy();
  });

  it("says when there were no online sales", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...data, sales: 0, orders: 0, otherSales: 0, products: [] })));
    render(<OnlineSalesReport from="2026-11-01" to="2026-11-30" />);
    expect(await screen.findByText("No online sales in this period.")).toBeTruthy();
  });
});
