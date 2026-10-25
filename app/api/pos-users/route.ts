import { proxyApiPos } from "@/lib/portal/api-pos-proxy";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return proxyApiPos(request, "/api-pos/locations/staff", "GET");
}
