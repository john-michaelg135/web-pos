import { createHmac } from "node:crypto";

/**
 * CREOMS's online storefront Sales, read from CREOMS's read-only feed (fjdvm/epic-crms docs/pos-sales-feed.md).
 * Server only: the token is signed with POS_CREOMS_SECRET, which must never reach a browser.
 */

export interface OnlineProductSales {
  /** The IMS product of the size, or null when CREOMS cannot tell which size the line was. */
  imsProductId: number | null;
  productName: string;
  sizeLabel: string;
  unitsSold: number;
  /** Centavos. */
  sales: number;
}

export interface OnlineSales {
  from: string;
  to: string;
  /** Centavos: paid or fulfilled online Orders less refunded Returns, dated by the Order. */
  sales: number;
  orders: number;
  products: OnlineProductSales[];
  /** Centavos: delivery fees and refund adjustments; products plus this equal `sales`. */
  otherSales: number;
}

export type OnlineSalesResult =
  | { ok: true; data: OnlineSales }
  | { ok: false; reason: "range" | "unavailable" };

const DEFAULT_CREOMS_URL = "https://creoms.buildwrite.me";
const MIN_SECRET = 32;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A fresh five-minute token that opens only the online sales feed. */
export function creomsSalesToken(secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const input = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ iss: "pos", aud: "creoms-sales", scope: "sales:read", iat, exp: iat + 300 })}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}

/** Online Sales for Philippine days `from` to `to`, both included. */
export async function readOnlineSales(from: string, to: string, fetcher: typeof fetch = fetch): Promise<OnlineSalesResult> {
  if (!DATE.test(from) || !DATE.test(to) || to < from) return { ok: false, reason: "range" };
  const secret = process.env.POS_CREOMS_SECRET;
  if (!secret || secret.length < MIN_SECRET) {
    console.error("POS_CREOMS_SECRET is not set, so online sales cannot be read from CREOMS");
    return { ok: false, reason: "unavailable" };
  }
  const base = (process.env.CREOMS_URL || DEFAULT_CREOMS_URL).replace(/\/+$/, "");
  const url = `${base}/api/internal/pos-sales?${new URLSearchParams({ from, to })}`;
  try {
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${creomsSalesToken(secret)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 400) return { ok: false, reason: "range" };
    if (!response.ok) {
      console.error(`CREOMS refused the online sales request (${response.status})`);
      return { ok: false, reason: "unavailable" };
    }
    const body = (await response.json()) as OnlineSales;
    return {
      ok: true,
      data: { from: body.from, to: body.to, sales: body.sales, orders: body.orders, products: body.products, otherSales: body.otherSales },
    };
  } catch (error) {
    console.error("Online sales could not be read from CREOMS", error);
    return { ok: false, reason: "unavailable" };
  }
}
