import { NextResponse } from "next/server";

/**
 * Calls that used to send the next-auth Bearer token to api-pos and are parked until
 * api-pos accepts Enterprise Portal authentication:
 *
 * - GET  /api/my-locations       (location scope of the current Staff)
 * - GET  /api/pos-users          (employee list merged with location assignments)
 * - POST /api/pos-users/assign   (assign or unassign a location)
 * - Order management data        (api-pos reads made with the Bearer token)
 * - Starting cash data           (api-pos reads made with the Bearer token)
 *
 * The first three Next.js routes answer with this response; the last two are called from the
 * browser straight through the /api-pos rewrite and need the same api-pos change.
 */
export function waitingOnApiPosAuth() {
  return NextResponse.json(
    { message: "Waiting on api-pos to accept Enterprise Portal authentication." },
    { status: 501 }
  );
}
