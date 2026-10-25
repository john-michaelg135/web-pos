import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "./config";

const DEFAULT_API_POS_URL = "http://localhost:5005";

export async function proxyApiPos(
  request: NextRequest,
  path: string,
  method: "GET" | "POST" | "DELETE",
) {
  const handle = request.cookies.get(SESSION_COOKIE)?.value;
  if (!handle) {
    return NextResponse.json({ message: "A valid POS session is required." }, { status: 401 });
  }

  const baseUrl = (process.env.API_POS_URL ?? DEFAULT_API_POS_URL).replace(/\/+$/, "");
  const headers = new Headers({
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(handle)}`,
  });
  let body: string | undefined;

  if (method === "POST") {
    headers.set("content-type", request.headers.get("content-type") ?? "application/json");
    body = await request.text();
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: request.signal,
    });
    const responseHeaders = new Headers({
      "cache-control": "no-store",
    });
    const contentType = response.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(
      "api-pos location request failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return NextResponse.json(
      { message: "The POS API is temporarily unavailable." },
      { status: 503 },
    );
  }
}
