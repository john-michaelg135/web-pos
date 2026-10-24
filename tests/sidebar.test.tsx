import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/shared/Sidebar";
import { ReturningToPortalCard } from "@/components/shared/ReturningToPortalCard";
import { navItemsFor, systems } from "@/components/shared/SidebarNav";
import { StaffProvider } from "@/context/AuthContext";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const ada = { name: "Ada Okafor", username: "ada.okafor", email: "ada@brenraphaels.test", role: "Manager" };

const render = (modules: string[]) =>
  renderToStaticMarkup(
    <StaffProvider staff={ada} modules={modules}>
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    </StaffProvider>,
  );

const linkTexts = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>.*?<span>([^<]+)<\/span>/g)].map((m) => m[2]);

const activeLinks = (html: string) =>
  [...html.matchAll(/<a [^>]*data-active="true"[^>]*>.*?<span>([^<]+)<\/span>/g)].map((m) => m[1]);

describe("sidebar", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("shows only the allowed Modules, in sidebar order", () => {
    expect(linkTexts(render(["Stock Management", "Dashboard", "Sales Reports"]))).toEqual([
      "Dashboard",
      "Stock Management",
      "Sales Reports",
    ]);
  });

  it("shows all six Modules when all are allowed, and no Admin item", () => {
    const html = render(navItemsFor(["Dashboard", "Sales Processing", "Order Management", "Product Management", "Stock Management", "Sales Reports"]).map((i) => i.name));

    expect(linkTexts(html)).toHaveLength(6);
    expect(html).not.toContain("Admin");
    expect(html).not.toContain("/admin/locations");
  });

  it("groups the Modules under SALES, CATALOG and INSIGHTS, with Dashboard alone on top", () => {
    const html = render(navItemsFor(["Dashboard", "Sales Processing", "Order Management", "Product Management", "Stock Management", "Sales Reports"]).map((i) => i.name));
    const labels = [...html.matchAll(/<li aria-hidden="true" class="[^"]*">([A-Z]+)<\/li>/g)].map((m) => m[1]);

    expect(labels).toEqual(["SALES", "CATALOG", "INSIGHTS"]);
    expect(html.indexOf("Dashboard")).toBeLessThan(html.indexOf("SALES"));
  });

  it("leaves out a group label when the Staff member holds none of its Modules", () => {
    const html = render(["Dashboard", "Sales Processing", "Sales Reports"]);
    const labels = [...html.matchAll(/<li aria-hidden="true" class="[^"]*">([A-Z]+)<\/li>/g)].map((m) => m[1]);

    expect(labels).toEqual(["SALES", "INSIGHTS"]);
  });

  it("sets items in 15px medium text with 18px icons", () => {
    const html = render(["Dashboard"]);

    expect(html).toContain("text-[15px]");
    expect(html).toContain("font-medium");
    expect(html).toContain("size-[18px]");
  });

  it("is 288px wide", () => {
    expect(render(["Dashboard"])).toContain("w-72");
  });

  it("shows the Point of Sale badge and the brand logo", () => {
    const html = render(["Dashboard"]);

    expect(html).toContain("Point of Sale");
    expect(html).toContain("bren-raphaels-logo.svg");
  });

  it("shows no items when no Module is allowed", () => {
    expect(linkTexts(render([]))).toEqual([]);
  });
});

describe("system switcher", () => {
  it("has exactly the five entries, POS active", () => {
    expect(systems.map((s) => s.fullName)).toEqual(["Enterprise Portal", "CRM", "HRM", "POS", "IMS"]);
    expect(systems.filter((s) => s.active).map((s) => s.fullName)).toEqual(["POS"]);
  });

  it("defaults to the production addresses", () => {
    expect(Object.fromEntries(systems.map((s) => [s.fullName, s.url]))).toEqual({
      "Enterprise Portal": "https://br-auth-three.vercel.app",
      CRM: "https://epic-crms.vercel.app",
      HRM: "https://hrms-arae.vercel.app",
      POS: undefined,
      IMS: "https://br-sims.vercel.app",
    });
  });
});

describe("returning card", () => {
  it("says it is returning to the Enterprise Portal", () => {
    expect(renderToStaticMarkup(<ReturningToPortalCard portalUrl="https://portal.test" navigate={() => {}} />)).toContain(
      "Returning to the Enterprise Portal",
    );
  });

  it("highlights the Dashboard on the root only", () => {
    const all = navItemsFor(["Dashboard", "Sales Processing"]).map((i) => i.name);

    expect(activeLinks(render(all))).toEqual(["Dashboard"]);

    pathname = "/sales-processing";
    expect(activeLinks(render(all))).not.toContain("Dashboard");
  });

  it("highlights the current page and the pages beneath it", () => {
    const all = navItemsFor(["Dashboard", "Sales Processing"]).map((i) => i.name);
    const sales = navItemsFor(["Sales Processing"])[0].href;

    pathname = sales;
    expect(activeLinks(render(all))).toEqual(["Sales Processing"]);

    pathname = `${sales}/42`;
    expect(activeLinks(render(all))).toEqual(["Sales Processing"]);
  });
});
