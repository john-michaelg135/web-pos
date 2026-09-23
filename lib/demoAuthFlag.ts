/**
 * TEMPORARY DEMO AUTH flag — remove after br-auth integration. See lib/demoAuth.tsx.
 *
 * This is a plain (non-"use client") module so it can be imported from BOTH
 * server components (app/layout.tsx, auth.ts middleware) and client components.
 * NEXT_PUBLIC_ vars are inlined at build time, so this works in every runtime.
 */
export function isDemoAuth(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_AUTH === "true";
}
