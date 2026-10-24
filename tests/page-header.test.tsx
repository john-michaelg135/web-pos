// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "@/components/shared/PageHeader";
import Dashboard from "@/app/(root)/page";

afterEach(cleanup);

describe("PageHeader", () => {
  it("shows the title as a level-one heading", () => {
    render(<PageHeader title="Orders" />);
    expect(screen.getByRole("heading", { level: 1, name: "Orders" })).toBeTruthy();
  });

  it("shows the badge, subtitle and actions when given", () => {
    render(
      <PageHeader
        title="Orders"
        badge={<span>Live</span>}
        subtitle="Everything placed today"
        actions={<button>New order</button>}
      />,
    );
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText("Everything placed today")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New order" })).toBeTruthy();
  });

  it("omits the subtitle and actions when not given", () => {
    const { container } = render(<PageHeader title="Orders" />);
    expect(container.querySelector("p")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Dashboard", () => {
  it("shows the page header before the Under Construction placeholder", () => {
    render(<Dashboard />);
    const heading = screen.getByRole("heading", { level: 1, name: "Dashboard" });
    const placeholder = screen.getByRole("heading", { name: "Under Construction" });
    expect(screen.getByText("Your sales at a glance")).toBeTruthy();
    expect(heading.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
