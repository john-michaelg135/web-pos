import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand/BrandLockup";

/** The shared frame for the pages Staff see at the edges of sign-in. */
export function AuthStatePage({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-md">
      <div className="flex max-w-[28rem] flex-col items-center space-y-sm text-center">
        <BrandLockup system="Enterprise Suite" className="mb-sm" />
        <h1 className="text-headline-md text-foreground">{title}</h1>
        <p className="text-body-sm text-muted-foreground">{children}</p>
        {actions ? <div className="flex flex-col items-center gap-xs">{actions}</div> : null}
      </div>
    </main>
  );
}

export const linkClass = "text-sm font-medium underline";
