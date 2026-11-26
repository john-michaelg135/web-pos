"use client";

import { useSyncExternalStore } from "react";

const tabChanged = "pos-subtab-change";

export function setUrlTab(tab: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(tabChanged));
}

function subscribe(listener: () => void) {
  window.addEventListener(tabChanged, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(tabChanged, listener);
    window.removeEventListener("popstate", listener);
  };
}

export function useUrlTab<T extends string>(tabs: readonly T[], fallback: T) {
  const requested = useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get("tab"), () => null);
  return tabs.find(tab => tab === requested) ?? fallback;
}
