import { waitingOnApiPosAuth } from "@/lib/portal/api-pos-pending";

export async function POST() {
  return waitingOnApiPosAuth();
}

export async function DELETE() {
  return waitingOnApiPosAuth();
}
