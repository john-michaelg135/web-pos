// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { StaffProvider } from "@/context/AuthContext";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const ada = { name: "Ada Okafor", username: "ada.okafor", email: "ada@brenraphaels.test", role: "Manager" };

beforeAll(() => {
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
  // jsdom does not implement submitting a form.
  HTMLFormElement.prototype.requestSubmit = function () {
    this.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  };
});

afterEach(cleanup);

const shell = (ui: React.ReactNode) =>
  render(
    <StaffProvider staff={ada} modules={["Dashboard"]}>
      <SidebarProvider>{ui}</SidebarProvider>
    </StaffProvider>,
  );

describe("profile footer", () => {
  it("shows the Staff member's name and Role from the Enterprise Portal", () => {
    shell(<Sidebar />);

    expect(screen.getByText("Ada Okafor")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
  });

  it("asks for confirmation before logging out, and posts to logout only once confirmed", async () => {
    const user = userEvent.setup();

    shell(<Sidebar />);
    const submitted = vi.fn((e: Event) => e.preventDefault());
    document.addEventListener("submit", submitted);

    await user.click(screen.getByRole("button", { name: "Log out" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.textContent).toContain("signed out of the Enterprise Portal");
    expect(submitted).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(submitted).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("dialog");
    await user.click(screen.getAllByRole("button", { name: "Log out" }).at(-1)!);

    expect(submitted).toHaveBeenCalledTimes(1);
    const form = submitted.mock.calls[0][0].target as HTMLFormElement;
    expect(form.method).toBe("post");
    expect(new URL(form.action).pathname).toBe("/api/portal/logout");
    document.removeEventListener("submit", submitted);
  });

  it("shows a signing-out state once confirmed", async () => {
    const user = userEvent.setup();

    shell(<Sidebar />);
    document.addEventListener("submit", (e) => e.preventDefault(), { once: true });

    await user.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("dialog");
    await user.click(screen.getAllByRole("button", { name: "Log out" }).at(-1)!);

    expect((await screen.findAllByText(/Signing out/)).length).toBeGreaterThan(0);
  });
});

describe("header", () => {
  it("has the sidebar trigger and no notification bell", () => {
    shell(<Header />);

    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /notification/i })).toBeNull();
  });
});
