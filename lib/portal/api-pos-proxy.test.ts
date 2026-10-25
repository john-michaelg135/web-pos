import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxyApiPos } from "./api-pos-proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("proxyApiPos", () => {
  it("requires the HttpOnly POS session and does not call api-pos without it", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await proxyApiPos(
      new NextRequest("https://localhost:3002/api/pos-users"),
      "/api-pos/locations/staff",
      "GET",
    );

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards only the POS session cookie to api-pos", async () => {
    vi.stubEnv("API_POS_URL", "https://api-pos.example.test");
    const fetch = vi.fn().mockResolvedValue(Response.json({ users: [] }));
    vi.stubGlobal("fetch", fetch);

    const request = new NextRequest("https://localhost:3002/api/pos-users", {
      headers: { cookie: "pos_session=opaque-handle; unrelated=large-cookie" },
    });
    const response = await proxyApiPos(request, "/api-pos/locations/staff", "GET");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://api-pos.example.test/api-pos/locations/staff",
      expect.objectContaining({
        method: "GET",
        headers: new Headers({ cookie: "pos_session=opaque-handle" }),
        cache: "no-store",
      }),
    );
    await expect(response.json()).resolves.toEqual({ users: [] });
  });

  it("forwards JSON assignment bodies without forwarding other browser cookies", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 1 }, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const request = new NextRequest("https://localhost:3002/api/pos-users/assign", {
      method: "POST",
      headers: {
        cookie: "pos_session=opaque-handle; unrelated=secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ authUserId: "portal-user", locationId: 2 }),
    });

    const response = await proxyApiPos(request, "/api-pos/locations/user-locations", "POST");

    expect(response.status).toBe(201);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5005/api-pos/locations/user-locations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ authUserId: "portal-user", locationId: 2 }),
        headers: new Headers({
          cookie: "pos_session=opaque-handle",
          "content-type": "application/json",
        }),
      }),
    );
  });
});
