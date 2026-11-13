// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metadata } from "@/app/layout";
import { metadata as reportsMetadata } from "@/app/(root)/manager/reports/page";
import { metadata as stockMetadata } from "@/app/(root)/stock-management/page";
import { metadata as cashMetadata } from "@/app/(root)/manager/starting-cash/page";
import NoAccessPage from "@/app/(auth)/no-access/page";
import SignInErrorPage from "@/app/(auth)/sign-in-error/page";
import UnavailablePage from "@/app/(auth)/unavailable/page";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "" });
  return { Inter: font, Fraunces: font, Geist_Mono: font };
});
vi.mock("@/app/globals.css", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.stubEnv("PORTAL_URL", "https://portal.example.test");

afterEach(cleanup);

describe("the auth and error pages", () => {
  it.each([
    ["no-access", NoAccessPage],
    ["sign-in-error", SignInErrorPage],
    ["unavailable", UnavailablePage],
  ])("%s shows the Enterprise Suite Lockup", async (_name, Page) => {
    render(await Page({ searchParams: Promise.resolve({}) }));

    const brand = screen.getByText("Bren Raphael's", { selector: "p" });
    expect(brand.nextElementSibling?.textContent).toBe("Enterprise Suite");
  });
});

describe("the browser tab", () => {
  it("reads the same title on every page", () => {
    for (const m of [metadata, reportsMetadata, stockMetadata, cashMetadata]) {
      expect(m.title).toBe("Bren Raphael's | Point of Sale System");
    }
  });
});
