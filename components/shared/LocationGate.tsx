"use client";

import { useSession, signOut } from "next-auth/react";
import { Loader2, Clock, LogOut, RefreshCw } from "lucide-react";
import { useMyLocations } from "@/lib/useMyLocations";
import { Button } from "@/components/ui/button";

// Portal launcher — where the user manages their suite session (incl. sign out).
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || "https://localhost:3000";

/**
 * Global location gate.
 *
 * A non-super user with no assigned branch cannot do any location-scoped work,
 * so instead of letting them into the app (where views would wrongly show
 * "All Locations"), we block the whole shell with a "processing" notice and
 * hold them there until an admin assigns a location.
 *
 * Super users bypass entirely (they are scoped to all locations).
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isSuperUser = !!session?.isSuperUser;

  const { isLoading, isUnassigned } = useMyLocations();

  // Super users never need a location — let them straight through without
  // even waiting on the scope fetch.
  if (isSuperUser) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isUnassigned) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-background px-6"
      >
        <div
          className="flex flex-col items-center text-center"
          style={{ width: "100%", maxWidth: "28rem" }}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 mb-5">
            <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Your account is being set up
          </h1>
          <p
            className="mt-2 text-sm text-muted-foreground"
            style={{ width: "100%" }}
          >
            You don&apos;t have a store location assigned yet. An administrator
            needs to assign your branch before you can start working. Please
            check back shortly — this usually only takes a moment once your
            admin completes the setup.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Check again
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                // Clear the local NextAuth session before leaving so a stale
                // token can't silently restore this account, then return to the
                // portal to sign in fresh.
                await signOut({ redirect: false });
                window.location.href = PORTAL_URL;
              }}
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
