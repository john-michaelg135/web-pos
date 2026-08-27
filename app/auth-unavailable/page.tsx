"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AuthUnavailablePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Auto-retry every 10 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/health", {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          router.replace("/signin");
        }
      } catch {
        // Still unreachable
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth/health", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        router.replace("/signin");
        return;
      }
    } catch {
      // Still unreachable
    }
    setChecking(false);
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-headline-md text-foreground">
          Authentication Unavailable
        </h1>
        <p className="text-body-md text-muted-foreground">
          The authentication service is currently unreachable. This page will
          automatically retry every 10 seconds.
        </p>
        <button
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Retry Now"}
        </button>
      </div>
    </div>
  );
}
