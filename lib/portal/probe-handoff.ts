import { createHmac } from "node:crypto";
import type { Staff } from "./client";

/** How long the signed pass to POS-PROBE stays usable; the browser follows it straight away. */
const HANDOFF_SECONDS = 60;

/** The address of POS-PROBE's dashboard. */
export function probeUrl(): string {
  return (process.env.PROBE_URL ?? "http://localhost:3006").replace(/\/$/, "");
}

function handoffSecret(): string {
  const secret = process.env.PROBE_HANDOFF_SECRET;

  if (!secret) {
    throw new Error("PROBE_HANDOFF_SECRET is not set; see .env.production.example");
  }

  return secret;
}

/**
 * A short-lived pass that tells POS-PROBE who the Staff member is. It is signed with the
 * secret both apps share, so POS-PROBE can trust it without asking the Enterprise Portal.
 */
export function signProbeHandoff(staff: Staff, role: "owner" | "manager"): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      purpose: "probe-handoff",
      name: staff.name,
      username: staff.username,
      email: staff.email,
      posRole: staff.role,
      role,
      iat: now,
      exp: now + HANDOFF_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", handoffSecret()).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}
