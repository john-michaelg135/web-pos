"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

/** Holds the page while the browser goes to the Enterprise Portal. */
export function SigningIn({
  loginUrl,
  navigate = (url) => window.location.replace(url),
}: {
  loginUrl: string;
  navigate?: (url: string) => void;
}) {
  useEffect(() => {
    navigate(loginUrl);
  }, [loginUrl, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center p-md">
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${loginUrl}`} />
      </noscript>
      <div className="flex flex-col items-center gap-xs text-center">
        <div className="relative size-12 overflow-hidden rounded-[12px] border border-[#ece6f2] bg-white">
          <Image src="/images/brand/logo-tile.png" alt="" fill sizes="48px" className="object-contain p-[3px]" />
        </div>
        <div className="flex items-center gap-sm text-body-md text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Opening POS…
        </div>
        <p className="text-body-sm text-muted-foreground">
          Handing your sign-in over securely
        </p>
      </div>
    </main>
  );
}
