import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Assign / unassign a POS user to a location. Super-admin only.
 * Proxies to api-pos user-location endpoints with the admin's access token,
 * stamping AssignedBy with the acting admin's id for audit.
 */

const API_POS_URL = process.env.API_POS_URL || "http://localhost:5005";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }) };
  }
  if (!session.isSuperUser) {
    return {
      error: NextResponse.json(
        { message: "Forbidden: location assignment requires a super admin." },
        { status: 403 }
      ),
    };
  }
  if (!session.accessToken) {
    return { error: NextResponse.json({ message: "No access token." }, { status: 401 }) };
  }
  return { session };
}

interface ExistingAssignment {
  id: number;
  locationId: number;
}

/**
 * A POS user works at exactly one branch. Assigning a location therefore
 * REPLACES any existing assignment: we remove the current one(s) before
 * creating the new one. This keeps the data model single-location and avoids
 * the "two branches on one name" state the UI can't represent.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.authUserId || !body?.locationId) {
    return NextResponse.json(
      { message: "authUserId and locationId are required." },
      { status: 400 }
    );
  }

  const authUserId = String(body.authUserId);
  const locationId = Number(body.locationId);
  const authHeader = { Authorization: `Bearer ${session!.accessToken}` };

  try {
    // 1. Load the user's current assignments so we can clear them first.
    let existing: ExistingAssignment[] = [];
    try {
      const currentRes = await fetch(
        `${API_POS_URL}/api-pos/locations/user-locations/${encodeURIComponent(authUserId)}`,
        { headers: authHeader, signal: AbortSignal.timeout(10_000), cache: "no-store" }
      );
      if (currentRes.ok) {
        existing = (await currentRes.json()) as ExistingAssignment[];
      }
    } catch (e) {
      console.error("[pos-users/assign] Failed to read existing assignments:", e);
      // Fall through: if we can't read existing assignments we still attempt
      // the new one rather than blocking the admin entirely.
    }

    // 2. If the user is already assigned to this exact location, no-op.
    if (existing.some((a) => Number(a.locationId) === locationId)) {
      // Remove any OTHER stray assignments so the user ends up single-location.
      await Promise.all(
        existing
          .filter((a) => Number(a.locationId) !== locationId)
          .map((a) =>
            fetch(
              `${API_POS_URL}/api-pos/locations/user-locations/${encodeURIComponent(String(a.id))}`,
              { method: "DELETE", headers: authHeader, signal: AbortSignal.timeout(10_000) }
            ).catch((e) => console.error("[pos-users/assign] cleanup delete failed:", e))
          )
      );
      return NextResponse.json({ success: true, unchanged: true }, { status: 200 });
    }

    // 3. Remove every existing assignment (the user works at one branch).
    await Promise.all(
      existing.map((a) =>
        fetch(
          `${API_POS_URL}/api-pos/locations/user-locations/${encodeURIComponent(String(a.id))}`,
          { method: "DELETE", headers: authHeader, signal: AbortSignal.timeout(10_000) }
        ).catch((e) => console.error("[pos-users/assign] replace delete failed:", e))
      )
    );

    // 4. Create the new assignment as primary (it's the only one).
    const res = await fetch(`${API_POS_URL}/api-pos/locations/user-locations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({
        authUserId,
        locationId,
        isPrimary: true,
        assignedBy: session!.user?.id ?? null,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { message: text || "Failed to assign location." },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json(), { status: 201 });
  } catch (e) {
    console.error("[pos-users/assign] POST failed:", e);
    return NextResponse.json({ message: "Failed to assign location." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "An assignment id is required." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API_POS_URL}/api-pos/locations/user-locations/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session!.accessToken}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      return NextResponse.json(
        { message: text || "Failed to remove assignment." },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[pos-users/assign] DELETE failed:", e);
    return NextResponse.json({ message: "Failed to remove assignment." }, { status: 502 });
  }
}
