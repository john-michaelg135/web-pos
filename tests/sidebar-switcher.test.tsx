// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/shared/Sidebar";
import { StaffProvider } from "@/context/AuthContext";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const ada = { name: "Ada Okafor", username: "ada.okafor", email: "ada@brenraphaels.test", role: "Manager" };

beforeAll(() => {
  // Radix and the sidebar read browser APIs jsdom leaves out.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

async function openSwitcher() {
  const user = userEvent.setup();

  render(
    <StaffProvider staff={ada} modules={["Dashboard"]}>
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    </StaffProvider>,
  );
  await user.click(screen.getByText("Bren Raphael's"));

  return { user, menu: await screen.findByRole("menu") };
}

describe("system switcher, rendered", () => {
  it("lists exactly the five systems with POS marked active", async () => {
    const { menu } = await openSwitcher();
    const items = within(menu).getAllByRole("menuitem");

    expect(items.map((i) => i.querySelector("span")?.textContent)).toEqual([
      "Enterprise Portal",
      "CRM",
      "HRM",
      "POS",
      "IMS",
    ]);
    expect(items.filter((i) => i.querySelector("svg.text-primary")).map((i) => i.textContent)).toEqual([
      expect.stringContaining("POS"),
    ]);
    expect(menu.textContent).not.toContain("E-Commerce");
  });

  it("shows the returning card when the Enterprise Portal is opened", async () => {
    const { user, menu } = await openSwitcher();

    expect(screen.queryByRole("status")).toBeNull();
    await user.click(within(menu).getByText("Enterprise Portal"));

    expect((await screen.findByRole("status")).textContent).toContain("Returning to the Enterprise Portal");
  });
});
