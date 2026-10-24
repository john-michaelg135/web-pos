import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Location Management data source.
 *
 * br-auth owns identity (the employee list) but not location. POS owns the
 * user→location assignment. This route joins the two:
 *   1. Fetch the employee list from br-auth `GET /api/Users` using the
 *      logged-in admin's access token (guarded by br-auth's AdminOnly policy,
 *      which requires isSuperUser=true).
 *   2. Fetch POS assignments from api-pos `GET /api-pos/locations/user-locations`.
 *   3. Merge them keyed on the br-auth user id (== OIDC "sub" == session.user.id).
 *
 * Only super users may call this — the br-auth endpoint would 403 otherwise, and
 * assignment is intentionally a super-admin-only capability.
 */

const AUTH_ISSUER = process.env.AUTH_ISSUER ?? "";
const API_POS_URL = process.env.API_POS_URL || "http://localhost:5005";

// br-auth system code for POS. Only users granted this system need a location.
const POS_SYSTEM_CODE = "POS";

// The POS "Dashboard" module is a passive viewer grant — a user with only
// Dashboard access does no location-scoped work and should NOT need a branch
// assignment. Operational POS staff have at least one non-Dashboard module.
const POS_NON_OPERATIONAL_MODULES = new Set(["dashboard"]);

// Roles that are location-agnostic (see all locations) and never need an
// assignment, so they are excluded from the staff list.
const SUPER_ROLES = new Set(["super admin", "ceo"]);

interface BrAuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isDeleted: boolean;
}

interface ModulePermission {
  moduleName: string;
}

interface AppPermission {
  appName: string;
  modules?: ModulePermission[];
}

interface BrAuthUserDetail extends BrAuthUser {
  apps: AppPermission[];
}

interface UserLocation {
  id: number;
  authUserId: string;
  locationId: number;
  locationName: string;
  locationType: string;
  isPrimary: boolean;
  assignedAt: string;
}

interface PosUserRow {
  authUserId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  locations: {
    id: number;
    locationId: number;
    locationName: string;
    locationType: string;
    isPrimary: boolean;
  }[];
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  // Fetching the br-auth user list requires super-admin (AdminOnly policy).
  if (!session.isSuperUser) {
    return NextResponse.json(
      { message: "Forbidden: location assignment requires a super admin." },
      { status: 403 }
    );
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { message: "No access token in session." },
      { status: 401 }
    );
  }

  try {
    // 1. br-auth employee list
    const usersRes = await fetch(`${AUTH_ISSUER}api/Users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!usersRes.ok) {
      return NextResponse.json(
        { message: `Failed to fetch users from auth service (${usersRes.status}).` },
        { status: 502 }
      );
    }

    const allUsers = (await usersRes.json()) as BrAuthUser[];

    // 1b. Keep only active, non-super users, then confirm POS system access.
    // Super admins/CEOs are location-agnostic and users from other systems
    // (no POS access) don't belong in the assignment list. The list DTO doesn't
    // carry app grants, so we check each candidate's detail for the POS system.
    const candidates = allUsers.filter(
      (u) => !u.isDeleted && !SUPER_ROLES.has((u.role ?? "").trim().toLowerCase())
    );

    const detailResults = await Promise.all(
      candidates.map(async (u) => {
        try {
          const res = await fetch(`${AUTH_ISSUER}api/Users/${encodeURIComponent(u.id)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
          });
          if (!res.ok) return null;
          const detail = (await res.json()) as BrAuthUserDetail;
          const posApp = (detail.apps ?? []).find(
            (a) => (a.appName ?? "").trim().toUpperCase() === POS_SYSTEM_CODE
          );
          // Operational POS staff have at least one non-Dashboard POS module.
          const isOperationalPosStaff = (posApp?.modules ?? []).some(
            (m) => !POS_NON_OPERATIONAL_MODULES.has((m.moduleName ?? "").trim().toLowerCase())
          );
          return isOperationalPosStaff ? detail : null;
        } catch {
          return null;
        }
      })
    );

    const users = detailResults.filter((u): u is BrAuthUserDetail => u !== null);

    // 2. POS assignments (Bearer forwards the same admin token to api-pos)
    const assignmentsRes = await fetch(
      `${API_POS_URL}/api-pos/locations/user-locations`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      }
    );

    const assignments: UserLocation[] = assignmentsRes.ok
      ? await assignmentsRes.json()
      : [];

    // 3. Merge keyed on the br-auth user id
    const byUser = new Map<string, UserLocation[]>();
    for (const a of assignments) {
      const list = byUser.get(a.authUserId) ?? [];
      list.push(a);
      byUser.set(a.authUserId, list);
    }

    const rows: PosUserRow[] = users
      .map((u) => ({
        authUserId: u.id,
        username: u.username,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username,
        email: u.email,
        role: u.role,
        locations: (byUser.get(u.id) ?? []).map((a) => ({
          id: a.id,
          locationId: a.locationId,
          locationName: a.locationName,
          locationType: a.locationType,
          isPrimary: a.isPrimary,
        })),
      }));

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error("[pos-users] Failed to load user list:", error);
    return NextResponse.json(
      { message: "Failed to load POS users." },
      { status: 502 }
    );
  }
}
