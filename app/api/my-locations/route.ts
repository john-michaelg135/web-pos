import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Returns the location scope for the CURRENT logged-in user, used to constrain
 * location-aware views (Sales Reports, Stock Receiving) at runtime.
 *
 *   { scope: "all", locations: [] }              -> super users: see everything
 *   { scope: "assigned", locations: [...] }      -> scoped to assigned branch(es)
 *
 * An assigned user with an empty list has no location and is effectively gated
 * out of location-scoped actions until an admin assigns one.
 */

const API_POS_URL = process.env.API_POS_URL || "http://localhost:5005";

interface UserLocation {
  id: number;
  authUserId: string;
  locationId: number;
  locationName: string;
  locationType: string;
  isPrimary: boolean;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  // Super users are scoped to every location.
  if (session.isSuperUser) {
    return NextResponse.json({ scope: "all", locations: [] });
  }

  const authUserId = session.user.id;
  const accessToken = session.accessToken;
  if (!authUserId || !accessToken) {
    return NextResponse.json({ scope: "assigned", locations: [] });
  }

  try {
    const res = await fetch(
      `${API_POS_URL}/api-pos/locations/user-locations/${encodeURIComponent(authUserId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      }
    );

    const assignments: UserLocation[] = res.ok ? await res.json() : [];

    return NextResponse.json({
      scope: "assigned",
      locations: assignments.map((a) => ({
        locationId: a.locationId,
        locationName: a.locationName,
        locationType: a.locationType,
        isPrimary: a.isPrimary,
      })),
      _debug: { sessionUserId: authUserId },
    });
  } catch (error) {
    console.error("[my-locations] Failed to load assignments:", error);
    return NextResponse.json({ scope: "assigned", locations: [] });
  }
}
