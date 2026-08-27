"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function RedirectToLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";
  const [status, setStatus] = useState<"checking" | "redirecting" | "error">("checking");

  useEffect(() => {
    let cancelled = false;

    async function attemptSignIn() {
      try {
        const res = await fetch("/api/auth/health", {
          method: "GET",
          signal: AbortSignal.timeout(6000),
        });

        if (cancelled) return;

        if (!res.ok) {
          router.replace("/auth-unavailable");
          return;
        }

        setStatus("redirecting");
        signIn("authservice", { callbackUrl });
      } catch {
        if (cancelled) return;
        router.replace("/auth-unavailable");
      }
    }

    attemptSignIn();
    return () => { cancelled = true; };
  }, [callbackUrl, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-2 font-sans text-body-md text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {status === "checking" ? "Checking authentication..." : "Redirecting to sign in..."}
      </div>
    </div>
  );
}
