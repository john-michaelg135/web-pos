"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-headline-md text-foreground">
          Access Denied
        </h1>
        <p className="text-body-md text-muted-foreground">
          You do not have permission to access the POS system. Contact your
          administrator if you believe this is an error.
        </p>
        <button
          onClick={() => router.push("/signin")}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
