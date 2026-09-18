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

  try {
    const res = await fetch(`${API_POS_URL}/api-pos/locations/user-locations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.accessToken}`,
      },
      body: JSON.stringify({
        authUserId: body.authUserId,
        locationId: Number(body.locationId),
        isPrimary: Boolean(body.isPrimary),
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
