import { portalConfig } from "./config";

export type ExchangeResult =
  | { ok: true; sessionHandle: string; expiresAt: Date }
  | { ok: false; reason: "rejected" | "denied" | "unavailable" };

function basicAuth(): string {
  const { systemName, systemSecret } = portalConfig();

  return `Basic ${Buffer.from(`${systemName}:${systemSecret}`).toString("base64")}`;
}

async function postJson(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(`${portalConfig().portalUrl}${path}`, {
      method: "POST",
      headers: { authorization: basicAuth(), "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/** Server-to-server exchange of the single-use sign-in code for an opaque session handle. */
export async function exchangeCode(input: {
  code: string;
  state: string;
  codeVerifier: string;
}): Promise<ExchangeResult> {
  const response = await postJson("/api/integrations/exchange", {
    code: input.code,
    state: input.state,
    code_verifier: input.codeVerifier,
    redirect_uri: portalConfig().callbackUrl,
  });

  if (!response || response.status >= 500) {
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 403) {
    return { ok: false, reason: "denied" };
  }

  const body = response.ok
    ? ((await response.json().catch(() => null)) as {
        handle?: string;
        expires_in?: number;
      } | null)
    : null;

  if (!body?.handle || typeof body.expires_in !== "number") {
    return { ok: false, reason: "rejected" };
  }

  return {
    ok: true,
    sessionHandle: body.handle,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
  };
}
