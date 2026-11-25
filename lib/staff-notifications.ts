// The POS staff bell, through the same-origin proxy (/api/pos/notifications...). api-pos scopes
// every read, count and mark to the signed-in Staff member's current Modules and branches.

export type StaffAlertKind =
  | "pos.refund-requested"
  | "pos.void-requested"
  | "pos.refund-approved"
  | "pos.refund-rejected"
  | "pos.void-approved"
  | "pos.void-rejected"
  | "pos.transfer-arrived"
  | "pos.low-stock"
  | "pos.stock-request-approved"
  | "pos.stock-request-rejected";

export type StaffAlert = {
  id: number;
  kind: StaffAlertKind | string;
  module: string;
  title: string;
  body: string;
  link: string;
  locationId: number | null;
  orderId: number | null;
  transferId: string | null;
  variationId: number | null;
  partial: boolean;
  createdAt: string;
  read: boolean;
};

export type StaffAlertPage = { items: StaffAlert[]; nextCursor: string | null; unread: number };

/** The bell can't be used by this Staff member (no session, or neither Module). It hides. */
export class BellUnavailableError extends Error {}

const BASE = "/api/pos/notifications";

async function call<T>(path: string, method: "GET" | "POST" = "GET"): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: method === "POST" ? { "content-type": "application/json" } : undefined,
    body: method === "POST" ? "{}" : undefined,
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401 || response.status === 403) throw new BellUnavailableError();
  if (!response.ok) throw new Error(`Notifications request failed (${response.status}).`);
  return (await response.json()) as T;
}

export function listAlerts(cursor?: string | null, limit = 20): Promise<StaffAlertPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return call<StaffAlertPage>(`?${query}`);
}

export const unreadCount = () => call<{ unread: number }>("/unread-count").then((r) => r.unread);

export const markAlertRead = (id: number) => call<{ unread: number }>(`/${id}/read`, "POST");

export const markAllAlertsRead = () => call<{ updated: number; unread: number }>("/read-all", "POST");

/** A one-time live-updates address, or null when live updates are off (the bell then polls). */
export async function liveTicketUrl(): Promise<string | null> {
  try {
    const { url } = await call<{ url?: string }>("/live-ticket", "POST");
    return typeof url === "string" && /^wss?:\/\//i.test(url) ? url : null;
  } catch (error) {
    if (error instanceof BellUnavailableError) throw error;
    return null;
  }
}

/** Only same-site POS paths are followed; anything else stays on the current page. */
export function safeAlertLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.includes("\\")) return null;
  return link;
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

/** When an alert was made, as the other Systems' bells show it: "11/26/2026, 12:26:48 AM", Philippine time. */
export function alertTime(createdAt: string): string {
  const at = Date.parse(createdAt);
  return Number.isNaN(at) ? "" : timeFormat.format(at);
}

/** Merges a refreshed first page into what is loaded, newest first, without duplicates. */
export function mergeAlerts(current: StaffAlert[], fresh: StaffAlert[]): StaffAlert[] {
  const byId = new Map<number, StaffAlert>();
  for (const alert of current) byId.set(alert.id, alert);
  for (const alert of fresh) byId.set(alert.id, alert);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

/** Delay before the next live reconnect: 2s, 4s, 8s … capped at 60s. */
export const reconnectDelay = (attempt: number) => Math.min(60_000, 2_000 * 2 ** Math.max(0, attempt));
