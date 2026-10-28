"use client";

import { useEffect, useState } from "react";

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

type Scope = { scope: "all" | "assigned"; locations: MyLocation[] };

// Every component on a page used to fetch the scope on its own (five requests on Sales
// Processing, each a Portal round trip). They now share one request, and its answer is
// reused for a minute so moving between tabs doesn't ask again.
const REUSE_MS = 60_000;
let shared: { at: number; scope: Scope } | null = null;
let inFlight: Promise<Scope> | null = null;

function loadScope(): Promise<Scope> {
  if (inFlight) return inFlight;
  inFlight = (async (): Promise<Scope> => {
    try {
      const res = await fetch("/api/my-locations", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = await res.json();
      const scope: Scope = {
        scope: body.scope === "all" ? "all" : "assigned",
        locations: Array.isArray(body.locations) ? body.locations : [],
      };
      shared = { at: Date.now(), scope };
      return scope;
    } catch (err) {
      console.error("Failed to load location scope:", err);
      return { scope: "assigned", locations: [] };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// One shared empty list, so effects that depend on `locations` don't re-run on every render while loading.
const NO_LOCATIONS: MyLocation[] = [];

const fresh = () => (shared && Date.now() - shared.at < REUSE_MS ? shared.scope : null);

/**
 * Runtime location scope for the current user. Views use this to constrain
 * their location selector: super users pick from all locations, assigned users
 * are limited to theirs, and unassigned users are gated.
 */
export function useMyLocations(): MyLocationScope {
  // A recent answer is used straight away, so revisited pages skip the loading state.
  const [result, setResult] = useState<Scope | null>(fresh);

  useEffect(() => {
    if (result) return;
    let cancelled = false;
    loadScope().then((scope) => {
      if (!cancelled) setResult(scope);
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const scope = result?.scope ?? "assigned";
  const locations = result?.locations ?? NO_LOCATIONS;
  return {
    scope,
    locations,
    isLoading: result === null,
    isUnassigned: result !== null && scope === "assigned" && locations.length === 0,
  };
}
