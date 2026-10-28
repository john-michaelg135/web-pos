"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Instant feedback for sidebar and bottom-bar navigation. Each page request waits on the
 * Enterprise Portal access check, so the next page can take a moment to arrive. Clicking a
 * tab records where we're going; the shell then shows that page's skeleton (real title,
 * tabs and layout) straight away, and the sidebar highlights the new tab, until the route
 * actually changes.
 */

/**
 * `from`: the page the click came from. `superseded`: tabs clicked earlier whose
 * navigations were still loading when this click happened; one of them can still land
 * first, and that must not end the wait for the tab clicked last.
 */
type Pending = { href: string; from: string; superseded: string[] };

const NavigationPendingContext = createContext<{
  pendingHref: string | null;
  start: (href: string) => void;
}>({ pendingHref: null, start: () => {} });

// Give up on showing the skeleton if a navigation never lands (e.g. it was cancelled).
const GIVE_UP_MS = 20000;

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [pending, setPending] = useState<Pending | null>(null);

  // Pending while we're still on the page the click came from, or on a tab clicked before
  // it that landed late. Any other route change (the target, or wherever the access check
  // redirected) ends it.
  const pendingHref =
    pending &&
    pending.href !== pathname &&
    (pending.from === pathname || pending.superseded.includes(pathname))
      ? pending.href
      : null;

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const start = useCallback(
    (href: string) =>
      setPending((prev) => {
        const stillLoading =
          prev && prev.href !== pathname && (prev.from === pathname || prev.superseded.includes(pathname));
        return {
          href,
          from: pathname,
          superseded: stillLoading ? [...prev.superseded, prev.href] : [],
        };
      }),
    [pathname]
  );
  const value = useMemo(() => ({ pendingHref, start }), [pendingHref, start]);

  return <NavigationPendingContext.Provider value={value}>{children}</NavigationPendingContext.Provider>;
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}

/** onClick for a nav link: marks the navigation pending unless it opens elsewhere or goes nowhere. */
export function useNavClick() {
  const { start } = useNavigationPending();
  const pathname = usePathname();
  return useCallback(
    (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      const newTab = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
      if (newTab || event.defaultPrevented || href === pathname) return;
      start(href);
    },
    [start, pathname]
  );
}
