import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/shared/Sidebar";
import { ReturningToPortalCard } from "@/components/shared/ReturningToPortalCard";
import { navItemsFor, systems } from "@/components/shared/SidebarNav";
import { StaffProvider } from "@/context/AuthContext";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

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

describe("sidebar", () => {
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
});
