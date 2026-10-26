import { NextResponse, type NextRequest } from "next/server";
import { proxyApiPos } from "@/lib/portal/api-pos-proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext, method: "GET" | "PUT") {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const isPinRead = method === "GET" && endpoint === "user-pin";
  const isOrderAction =
    method === "PUT" &&
    /^order-management\/orders\/\d+\/(approve-void|reject-void|request-void|approve-refund|reject-refund|request-refund|complete-payment|status)$/.test(endpoint);

  if (!isPinRead && !isOrderAction) {
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
