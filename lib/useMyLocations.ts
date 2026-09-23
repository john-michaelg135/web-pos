"use client";

import { useEffect, useState } from "react";
// TEMPORARY DEMO AUTH — remove after br-auth integration. See lib/demoAuth.tsx.
import { isDemoAuth, useDemoAuth } from "@/lib/demoAuth";

export interface MyLocation {
  locationId: number;
  locationName: string;
  locationType: string;
  isPrimary: boolean;
}

export interface MyLocationScope {
  /** "all" for super users, "assigned" for everyone else. */
  scope: "all" | "assigned";
  /** Assigned locations. Empty when scope is "all" (means every location). */
  locations: MyLocation[];
  isLoading: boolean;
  /** True when a non-super user has no assigned location yet. */
  isUnassigned: boolean;
}

/**
 * Runtime location scope for the current user. Views use this to constrain
 * their location selector: super users pick from all locations, assigned users
 * are limited to theirs, and unassigned users are gated.
 */
export function useMyLocations(): MyLocationScope {
  const [scope, setScope] = useState<"all" | "assigned">("assigned");
  const [locations, setLocations] = useState<MyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // DEMO AUTH: role + selected branch drive the scope.
  const { role: demoRole, selectedLocation: demoLocation } = useDemoAuth();

  useEffect(() => {
    let cancelled = false;

    // DEMO AUTH: skip the token-gated /api/my-locations call and derive scope
    // from the demo role. Owner/Admin gets "all" (every location) so the
    // location selector appears and reports/stock cover all branches;
    // Cashier/Manager are pinned to the REAL selected demo branch (reassignable
    // from the demo switcher), so sales they create match Order Management.
    if (isDemoAuth()) {
      if (demoRole === "owner") {
        setScope("all");
        setLocations([]);
      } else {
        setScope("assigned");
        setLocations(
          demoLocation
            ? [
                {
                  locationId: demoLocation.locationId,
                  locationName: demoLocation.locationName,
                  locationType: demoLocation.locationType,
                  isPrimary: true,
                },
              ]
            : []
        );
      }
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch("/api/my-locations", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const body = await res.json();
        if (cancelled) return;
        setScope(body.scope === "all" ? "all" : "assigned");
        setLocations(Array.isArray(body.locations) ? body.locations : []);
      } catch (err) {
        console.error("Failed to load location scope:", err);
        if (!cancelled) {
          setScope("assigned");
          setLocations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-derive scope when the demo role OR selected branch changes.
  }, [demoRole, demoLocation]);

  return {
    scope,
    locations,
    isLoading,
    isUnassigned: scope === "assigned" && locations.length === 0,
  };
}
