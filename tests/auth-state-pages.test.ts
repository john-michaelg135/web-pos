import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NoAccessPage from "@/app/(auth)/no-access/page";
import SignInErrorPage from "@/app/(auth)/sign-in-error/page";
import SigningInPage from "@/app/(auth)/signing-in/page";
import UnavailablePage from "@/app/(auth)/unavailable/page";

const PORTAL = "https://portal.test";

beforeEach(() => {
  vi.stubEnv("PORTAL_URL", `${PORTAL}/`);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const html = async (page: unknown) =>
  renderToStaticMarkup(await (page as () => Promise<React.ReactElement>)());

const errorPage = (reason?: string) =>
  html(() => SignInErrorPage({ searchParams: Promise.resolve({ reason }) }));

describe("sign-in error page", () => {
  it("says POS access was denied, in Enterprise Portal terms", async () => {
    const page = await errorPage("denied");

    expect(page).toContain("You don&#x27;t have access to POS");
    expect(page).toContain("Enterprise Portal");
  });

  it("says sign-in is unavailable when the Enterprise Portal could not be reached", async () => {
    expect(await errorPage("unavailable")).toContain("Sign-in is temporarily unavailable");
  });

  it.each(["failed", "nonsense", undefined])("falls back to failed for %s", async (reason) => {
    expect(await errorPage(reason)).toContain("Sign-in could not be completed");
  });

  it("offers signing in again", async () => {
    expect(await errorPage("failed")).toContain('href="/api/portal/login"');
  });

  it("never says Portal on its own or User", async () => {
    for (const reason of ["denied", "unavailable", "failed"]) {
      const text = (await errorPage(reason)).replace(/Enterprise Portal/g, "");

      expect(text).not.toMatch(/Portal|User|Auth/);
    }
  });
});

describe("copy on every page", () => {
  it("uses Staff and Enterprise Portal, never bare Portal or User", async () => {
    const pages = [
      await html(() => NoAccessPage()),
      await html(() => UnavailablePage({ searchParams: Promise.resolve({}) })),
      await errorPage("denied"),
    ].map((page) => page.replace(/href="[^"]*"/g, ""));

    for (const page of pages) {
      expect(page.replace(/Enterprise Portal/g, "")).not.toMatch(/Portal|User|Auth/);
    }
    expect(pages[0]).toContain("Staff");
    expect(pages[2]).toContain("Staff");
  });
});

describe("no-access page", () => {
  it("can be left by returning to the Enterprise Portal", async () => {
    const page = await html(() => NoAccessPage());

    expect(page).toContain(`href="${PORTAL}"`);
    expect(page).toContain("Return to the Enterprise Portal");
  });
});

describe("unavailable page", () => {
  const render = (returnTo?: string) =>
    html(() => UnavailablePage({ searchParams: Promise.resolve({ returnTo }) }));

  it("can retry the page that was asked for or return to the Enterprise Portal", async () => {
    const page = await render("/order-management?tab=open");

    expect(page).toContain('href="/order-management?tab=open"');
    expect(page).toContain(`href="${PORTAL}"`);
  });

  it("retries at the landing page for an unsafe return address", async () => {
    expect(await render("https://evil.test")).toContain('href="/"');
  });
});

describe("signing-in page", () => {
  it("hands over to login with the page asked for", async () => {
    const element = await SigningInPage({ searchParams: Promise.resolve({ returnTo: "/stock-management" }) });

    expect(element.props.loginUrl).toBe("/api/portal/login?returnTo=%2Fstock-management");
  });

  it("drops an unsafe return address", async () => {
    const element = await SigningInPage({ searchParams: Promise.resolve({ returnTo: "//evil.test" }) });

    expect(element.props.loginUrl).toBe("/api/portal/login?returnTo=%2F");
  });
});
