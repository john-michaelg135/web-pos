"use client";

/**
 * ============================================================================
 * TEMPORARY DEMO AUTH MODE  — REMOVE AFTER PRESENTATION
 * ============================================================================
 * Purpose: let us showcase POS RBAC (Cashier / Manager / Owner-Admin) WITHOUT a
 * live br-auth integration. When NEXT_PUBLIC_DEMO_AUTH === "true", the app skips
 * the real OIDC login and runs on a mock NextAuth session whose role can be
 * switched live from a floating widget.
 *
 * FULLY REVERSIBLE:
 *   - Everything here is gated by isDemoAuth(). With the flag unset/false, none
 *     of this renders and the real br-auth flow is unchanged.
 *   - To remove entirely after br-auth is ready:
 *       1. Delete this file (lib/demoAuth.tsx).
 *       2. Revert the small `isDemoAuth()` conditionals in:
 *            app/layout.tsx, pages/_app.tsx, auth.ts (authorized callback),
 *            lib/useMyLocations.ts, and the shell that renders <DemoRoleSwitcher/>.
 *       3. Unset NEXT_PUBLIC_DEMO_AUTH.
 *     Search the codebase for "DEMO AUTH" / "isDemoAuth" to find every touchpoint.
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionContext } from "next-auth/react";
import type { Session } from "next-auth";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  POS_MODULES,
  canAccessPath,
  firstAccessiblePath,
  type PermissionsMap,
} from "@/lib/permissions";
import { isDemoAuth } from "@/lib/demoAuthFlag";

// Re-export so existing client imports (`import { isDemoAuth } from "@/lib/demoAuth"`)
// keep working. Server components should import from "@/lib/demoAuthFlag" directly.
export { isDemoAuth };

export type DemoRole = "cashier" | "manager" | "owner";

interface DemoRoleConfig {
  key: DemoRole;
  label: string;
  /** Display name shown in the profile footer, etc. */
  displayName: string;
  /** br-auth-style role string surfaced as session.role. */
  roleString: string;
  /** Owner/Admin is modeled as a super user (bypasses all granular checks). */
  isSuperUser: boolean;
  /** Compact POS permissions map: { "<Module>": "rwudae" }. */
  permissions: PermissionsMap;
}

/**
 * Permission presets mirroring the agreed RBAC matrix. Letters:
 *   r=read w=write u=update d=delete a=approve e=export
 */
export const DEMO_ROLES: Record<DemoRole, DemoRoleConfig> = {
  cashier: {
    key: "cashier",
    label: "Cashier",
    displayName: "Demo Cashier",
    roleString: "Staff/Employee",
    isSuperUser: false,
    permissions: {
      // No Dashboard access for cashiers.
      [POS_MODULES.SALES_PROCESSING]: "rw",
      [POS_MODULES.ORDER_MANAGEMENT]: "rw", // no approve → files refund requests only
      [POS_MODULES.PRODUCT_MANAGEMENT]: "r", // price lookup, read-only
    },
  },
  manager: {
    key: "manager",
    label: "Manager",
    displayName: "Demo Manager",
    roleString: "Staff/Employee",
    isSuperUser: false,
    permissions: {
      // No Dashboard access for managers.
      [POS_MODULES.SALES_PROCESSING]: "rwu",
      [POS_MODULES.ORDER_MANAGEMENT]: "rwua", // approve → can approve/reject refunds
      [POS_MODULES.PRODUCT_MANAGEMENT]: "rwu",
      [POS_MODULES.SALES_REPORTS]: "re", // read + export (branch reports)
      [POS_MODULES.STOCK_MANAGEMENT]: "rwua",
    },
  },
  owner: {
    key: "owner",
    label: "Admin",
    displayName: "Demo Owner",
    roleString: "Super Admin",
    isSuperUser: true, // bypasses all checks; sees every module + all branches
    permissions: {},
  },
};

const DEFAULT_ROLE: DemoRole = "cashier";

/** A branch the demo can operate as. Sourced from the real api-pos locations. */
export interface DemoLocation {
  locationId: number;
  locationName: string;
  locationType: string;
}

interface DemoAuthContextValue {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  /** Real branches loaded from api-pos (tokenless). */
  locations: DemoLocation[];
  /** The branch Cashier/Manager currently operate as (reassignable). */
  selectedLocation: DemoLocation | null;
  setSelectedLocationId: (locationId: number) => void;
}

const DemoAuthContext = createContext<DemoAuthContextValue>({
  role: DEFAULT_ROLE,
  setRole: () => {},
  locations: [],
  selectedLocation: null,
  setSelectedLocationId: () => {},
});

export function useDemoAuth(): DemoAuthContextValue {
  return useContext(DemoAuthContext);
}

/** Builds the mock NextAuth session for the given demo role. */
function buildMockSession(role: DemoRole): Session {
  const cfg = DEMO_ROLES[role];
  return {
    // Far-future expiry so next-auth treats the session as valid.
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      name: cfg.displayName,
      email: `${role}@demo.local`,
    },
    // Custom session fields (see types/next-auth.d.ts).
    accessToken: "demo-token",
    systems: ["POS"],
    role: cfg.roleString,
    isSuperUser: cfg.isSuperUser,
    permissions: cfg.permissions,
  } as Session;
}

/**
 * Provides a mock NextAuth session and holds the current demo role in state.
 *
 * IMPORTANT: we drive next-auth's SessionContext DIRECTLY rather than passing a
 * `session` prop to <SessionProvider>. SessionProvider treats its `session` prop
 * as an initial value only and does NOT re-broadcast when the prop changes — so
 * switching roles wouldn't update useSession() consumers (sidebar, pages). By
 * supplying SessionContext.Provider ourselves, every useSession() call re-renders
 * the instant the role changes.
 *
 * Only mount this when isDemoAuth() is true.
 */
export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<DemoRole>(DEFAULT_ROLE);
  const [locations, setLocations] = useState<DemoLocation[]>([]);
  const [selectedLocationId, setSelectedLocationIdState] = useState<number | null>(null);

  // Load REAL branches from api-pos (tokenless; api-pos runs with auth disabled
  // in demo). Using real rows keeps the demo location's id + name in sync with
  // the DB, so sales created here actually match what Order Management lists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${base}/api-pos/locations`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped: DemoLocation[] = data
          .map((l: any) => ({
            locationId: Number(l.locationId),
            locationName: String(l.locationName ?? ""),
            locationType: String(l.locationType ?? "Store"),
          }))
          // Exclude the Commissary (999) — demo operates as retail branches.
          .filter((l: DemoLocation) => l.locationId && l.locationId !== 999);
        setLocations(mapped);
        // Default the selected branch to the first real store.
        setSelectedLocationIdState((prev) => prev ?? mapped[0]?.locationId ?? null);
      } catch {
        /* leave empty on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.locationId === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const setSelectedLocationId = (locationId: number) => setSelectedLocationIdState(locationId);

  const session = useMemo(() => buildMockSession(role), [role]);

  const sessionValue = useMemo(
    () => ({
      data: session,
      status: "authenticated" as const,
      // useSession() consumers may call update(); make it a no-op that returns
      // the current mock session.
      update: async () => session,
    }),
    [session]
  );

  const demoValue = useMemo(
    () => ({ role, setRole, locations, selectedLocation, setSelectedLocationId }),
    [role, locations, selectedLocation]
  );

  return (
    <DemoAuthContext.Provider value={demoValue}>
      <SessionContext.Provider value={sessionValue}>
        {children}
      </SessionContext.Provider>
    </DemoAuthContext.Provider>
  );
}

/**
 * Client-side access guard for demo mode. Because the OIDC middleware is
 * bypassed in demo mode (see auth.ts), this reproduces its behavior: if the
 * current demo role can't read the module for the current path, it redirects to
 * the role's first accessible tab (or shows nothing while redirecting). This is
 * why e.g. a Cashier/Manager can't sit on the Dashboard route "/".
 *
 * Mount inside the app shell (app/(root)/layout.tsx). Renders children only when
 * access is allowed; otherwise redirects and renders nothing to avoid a flash of
 * forbidden content.
 */
export function DemoAccessGuard({ children }: { children: React.ReactNode }) {
  const { role } = useDemoAuth();
  const pathname = usePathname();
  const router = useRouter();

  const cfg = DEMO_ROLES[role];
  const allowed = canAccessPath(pathname ?? "/", cfg.permissions, cfg.isSuperUser);

  useEffect(() => {
    if (!isDemoAuth()) return;
    if (allowed) return;
    const landing = firstAccessiblePath(cfg.permissions);
    router.replace(landing && landing !== pathname ? landing : "/access-denied");
  }, [allowed, cfg.permissions, pathname, router]);

  // While redirecting away from a forbidden route, render nothing.
  if (isDemoAuth() && !allowed) return null;

  return <>{children}</>;
}

/**
 * Floating role-switcher shown only in demo mode. Lets the presenter flip
 * between Cashier / Manager / Owner and see nav, pages, and refund buttons
 * react to the permission changes immediately.
 *
 * Collapsible: starts expanded, and can shrink to a compact pill (showing the
 * current role) to stay out of the way during a demo.
 */
export function DemoRoleSwitcher() {
  const { role, setRole, locations, selectedLocation, setSelectedLocationId } = useDemoAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!isDemoAuth()) return null;

  const activeLabel = DEMO_ROLES[role].label;
  // Owner sees all branches (super user), so the per-branch picker only applies
  // to Cashier/Manager, who operate as a single assigned branch.
  const showBranchPicker = role !== "owner" && locations.length > 0;

  // Collapsed: a compact pill that reopens the full switcher on click.
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="Expand demo role switcher"
        className="fixed bottom-4 right-4 z-[100000] flex items-center gap-2 rounded-full border border-border bg-popover/95 backdrop-blur shadow-xl px-3 py-2 text-popover-foreground hover:bg-accent transition-colors"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-xs font-semibold">{activeLabel}</span>
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100000] rounded-xl border border-border bg-popover/95 backdrop-blur shadow-xl p-3 text-popover-foreground">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Demo Mode — Role
        </span>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse"
          className="ml-auto -mr-1 rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1.5">
        {(Object.values(DEMO_ROLES)).map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => setRole(cfg.key)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
              (role === cfg.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Reassignable branch: Cashier/Manager operate as this location, so
          sales they create show up under this branch in Order Management. */}
      {showBranchPicker && (
        <div className="mt-2.5">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Branch
          </label>
          <select
            value={selectedLocation?.locationId ?? ""}
            onChange={(e) => setSelectedLocationId(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {locations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationName}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="mt-2 max-w-[16rem] text-[10px] leading-tight text-muted-foreground">
        Temporary preview auth. Switches RBAC role without br-auth. Remove before production.
      </p>
    </div>
  );
}
