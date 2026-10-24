import { waitingOnApiPosAuth } from "@/lib/portal/api-pos-pending";

export async function GET() {
  return waitingOnApiPosAuth();
}
