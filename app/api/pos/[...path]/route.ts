import { NextResponse, type NextRequest } from "next/server";
import { proxyApiPos } from "@/lib/portal/api-pos-proxy";
import { isAllowedPosEndpoint, type PosProxyMethod } from "@/lib/portal/pos-endpoints";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext, method: PosProxyMethod) {
  const { path } = await context.params;
  const endpoint = path.join("/");

  if (!isAllowedPosEndpoint(method, endpoint)) {
    return NextResponse.json({ message: "POS endpoint not found." }, { status: 404 });
  }

  return proxyApiPos(
    request,
    `/api-pos/${endpoint}${request.nextUrl.search}`,
    method,
  );
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context, "GET");
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context, "PUT");
}

// POST: the proof-upload routes, the staff bell actions, and the manager PIN reveal.
export function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context, "POST");
}
