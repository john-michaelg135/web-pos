"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/** Holds the page while the browser goes back to the Enterprise Portal. */
export function ReturningToPortalCard({
  portalUrl,
  navigate = (url) => window.location.assign(url),
}: {
  portalUrl: string;
  navigate?: (url: string) => void;
}) {
  useEffect(() => {
    navigate(portalUrl);
  }, [portalUrl, navigate]);

  return (
    <div
      role="status"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-md"
    >
      <div className="max-w-[24rem] space-y-xs rounded-xl border border-border bg-card p-md text-center shadow-xl">
        <div className="flex items-center justify-center gap-sm text-body-md text-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Returning to the Enterprise Portal…
        </div>
        <p className="text-body-sm text-muted-foreground">
          You stay signed in while you move between systems.
        </p>
      </div>
    </div>
  );
}
