import { afterEach, describe, expect, it, vi } from "vitest";

import { ProofUploadError, uploadProofPhoto } from "@/components/module-pos/proofUpload";
import { isProofReferenceRefusal } from "@/components/module-pos/ProofPhotoPicker";
import { isAllowedPosEndpoint } from "@/lib/portal/pos-endpoints";

type Call = { url: string; init: RequestInit };

function stubFetch(responses: Array<Response | Error>) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    if (next instanceof Error) throw next;
    return next;
  }));
  return calls;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("uploadProofPhoto", () => {
  const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: "image/jpeg" });

  it("sends metadata through the proxy, bytes only on the signed PUT, then confirms", async () => {
    const calls = stubFetch([
      json(201, { uploadUrl: "https://bucket.test/u?sig=1", uploadUrlExpiresInSeconds: 900, pendingReference: "v1.pending.sig" }),
      new Response(null, { status: 200 }),
      json(200, { proofReference: "v1.ready.sig", proofReferenceExpiresInSeconds: 3600 }),
    ]);

    const uploaded = await uploadProofPhoto("4821", "refund", photo);

    expect(uploaded.proofReference).toBe("v1.ready.sig");
    expect(uploaded.expiresAt).toBeGreaterThan(Date.now() + 3_500_000);

    expect(calls[0].url).toBe("/api/pos/order-management/orders/4821/proof-uploads/refund");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ filename: "refund-proof.jpg", contentType: "image/jpeg", size: 7 });

    expect(calls[1].url).toBe("https://bucket.test/u?sig=1");
    expect(calls[1].init.method).toBe("PUT");
    expect(calls[1].init.credentials).toBe("omit");
    expect(calls[1].init.body).toBe(photo);
    expect((calls[1].init.headers as Record<string, string>)["content-type"]).toBe("image/jpeg");

    expect(calls[2].url).toBe("/api/pos/order-management/orders/4821/proof-uploads/refund/confirm");
    expect(JSON.parse(calls[2].init.body as string)).toEqual({ pendingReference: "v1.pending.sig" });
    // Image bytes never go to the POS proxy.
    for (const call of [calls[0], calls[2]]) expect(typeof call.init.body).toBe("string");
  });

  it("stops at a failed browser PUT without confirming", async () => {
    const calls = stubFetch([
      json(201, { uploadUrl: "https://bucket.test/u", uploadUrlExpiresInSeconds: 900, pendingReference: "p" }),
      new Response(null, { status: 403 }),
    ]);

    await expect(uploadProofPhoto("4821", "delivery", photo)).rejects.toMatchObject({ reattach: true });
    expect(calls).toHaveLength(2);
  });

  it("surfaces the server's message and whether to reattach", async () => {
    stubFetch([
      json(201, { uploadUrl: "https://bucket.test/u", uploadUrlExpiresInSeconds: 900, pendingReference: "p" }),
      new Response(null, { status: 200 }),
      json(422, { message: "The uploaded photo does not match its declared size or type. Attach it again." }),
    ]);
    const mismatch = await uploadProofPhoto("4821", "refund", photo).catch((e) => e);
    expect(mismatch).toBeInstanceOf(ProofUploadError);
    expect(mismatch.message).toMatch(/does not match/);
    expect(mismatch.reattach).toBe(true);

    stubFetch([json(503, { message: "Photo storage is temporarily unavailable. Please try again." })]);
    const outage = await uploadProofPhoto("4821", "refund", photo).catch((e) => e);
    expect(outage.reattach).toBe(false);
  });
});

describe("proxy allowlist", () => {
  it("allows POST only for the two proof-upload route shapes", () => {
    expect(isAllowedPosEndpoint("POST", "order-management/orders/4821/proof-uploads/refund")).toBe(true);
    expect(isAllowedPosEndpoint("POST", "order-management/orders/4821/proof-uploads/delivery/confirm")).toBe(true);
    expect(isAllowedPosEndpoint("POST", "order-management/orders/4821/proof-uploads/avatar")).toBe(false);
    expect(isAllowedPosEndpoint("POST", "order-management/orders/4821/request-refund")).toBe(false);
    expect(isAllowedPosEndpoint("PUT", "order-management/orders/4821/proof-uploads/refund")).toBe(false);
    expect(isAllowedPosEndpoint("GET", "order-management/orders/4821/refund-proof")).toBe(true);
    expect(isAllowedPosEndpoint("PUT", "order-management/orders/4821/request-refund")).toBe(true);
  });
});

it("recognizes api-pos refusing an upload reference at save", () => {
  expect(isProofReferenceRefusal("That photo upload is invalid or expired. Attach the photo again.")).toBe(true);
  expect(isProofReferenceRefusal("Enter who received the order.")).toBe(false);
});
