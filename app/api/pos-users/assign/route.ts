import { NextResponse, type NextRequest } from "next/server";

import { proxyApiPos } from "@/lib/portal/api-pos-proxy";

export async function POST(request: NextRequest) {
  return proxyApiPos(request, "/api-pos/locations/user-locations", "POST");
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "A valid assignment id is required." }, { status: 400 });
  }

  return proxyApiPos(request, `/api-pos/locations/user-locations/${id}`, "DELETE");
}
