"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useNavigationPending } from "./NavigationPending";
import { POS_MODULES } from "@/lib/permissions";
import {
  BellUnavailableError,
  alertTime,
  listAlerts,
  liveTicketUrl,
  markAlertRead,
  markAllAlertsRead,
  mergeAlerts,
  reconnectDelay,
  safeAlertLink,
  type StaffAlert,
} from "@/lib/staff-notifications";

// Without live updates the bell polls; with them it still refreshes now and then as a safety net.
const POLL_MS = 30_000;
const LIVE_SAFETY_MS = 5 * 60_000;
// After live updates are reported off, ask again this much later.
const LIVE_RETRY_MS = 5 * 60_000;


export function HeaderNotifications() {
  const { can } = useAuth();
  const router = useRouter();
  const { start } = useNavigationPending();
  const eligible = can(POS_MODULES.ORDER_MANAGEMENT) || can(POS_MODULES.STOCK_MANAGEMENT);

  const [available, setAvailable] = useState(true);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StaffAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const loadedMore = useRef(false);

  const fail = useCallback((error: unknown) => {
    if (error instanceof BellUnavailableError) setAvailable(false);
    else setFailed(true);
  }, []);

  // Refetch the first page the Staff member may see. Pages loaded with "Load more" are kept.
  const refresh = useCallback(async () => {
    try {
      const page = await listAlerts();
      setItems((current) => (loadedMore.current ? mergeAlerts(current, page.items) : page.items));
      if (!loadedMore.current) setNextCursor(page.nextCursor);
      setUnread(page.unread);
      setFailed(false);
    } catch (error) {
      fail(error);
    }
  }, [fail]);

  const enabled = eligible && available;

  // First load, then polling while live updates are off (or a slow safety refresh while on).
  useEffect(() => {
    if (!enabled) return;
    void refresh().finally(() => setLoading(false));
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, live ? LIVE_SAFETY_MS : POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, live, refresh]);

  // Live updates: each notice is only a "something changed" nudge with no business data, so the
  // bell refetches what it is allowed to see. A new ticket is fetched for every (re)connect.
  useEffect(() => {
    if (!enabled) return;
    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let attempt = 0;
    let stopped = false;

    const connect = async () => {
      let url: string | null = null;
      try {
        url = await liveTicketUrl();
      } catch (error) {
        fail(error);
        return;
      }
      if (stopped) return;
      if (!url) {
        setLive(false);
        timer = window.setTimeout(connect, LIVE_RETRY_MS);
        return;
      }
      const ws = new WebSocket(url);
      socket = ws;
      ws.onopen = () => {
        attempt = 0;
        setLive(true);
        void refresh();
      };
      ws.onmessage = () => void refresh();
      ws.onclose = () => {
        if (socket !== ws) return;
        socket = null;
        setLive(false);
        if (!stopped) timer = window.setTimeout(connect, reconnectDelay(attempt++));
      };
    };

    void connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      const ws = socket;
      socket = null;
      ws?.close();
      setLive(false);
    };
  }, [enabled, fail, refresh]);

  if (!enabled) return null;

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listAlerts(nextCursor);
      loadedMore.current = true;
      setItems((current) => mergeAlerts(current, page.items));
      setNextCursor(page.nextCursor);
      setUnread(page.unread);
    } catch (error) {
      fail(error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Reading an alert only marks it read; it never approves a refund or completes a transfer.
  const openAlert = async (alert: StaffAlert) => {
    const link = safeAlertLink(alert.link);
    if (!alert.read) {
      setItems((current) => current.map((a) => (a.id === alert.id ? { ...a, read: true } : a)));
      setUnread((n) => Math.max(0, n - 1));
      markAlertRead(alert.id)
        .then((r) => setUnread(r.unread))
        .catch(() => void refresh());
    }
    if (link) {
      start(new URL(link, window.location.href).pathname);
      router.push(link);
    }
  };

  const markAll = async () => {
    setItems((current) => current.map((a) => ({ ...a, read: true })));
    setUnread(0);
    try {
      const r = await markAllAlertsRead();
      setUnread(r.unread);
    } catch {
      void refresh();
    }
  };

  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground transition-all hover:bg-sidebar-accent cursor-pointer"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-4 text-center tabular-nums">
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 max-w-[calc(100vw-2rem)] p-0 bg-popover border-border text-popover-foreground shadow-lg z-[99999]"
        align="end"
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
          <DropdownMenuLabel className="p-0 text-base font-semibold text-foreground">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0}
            onClick={(e) => {
              e.preventDefault();
              void markAll();
            }}
            className="h-auto p-0 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/80"
          >
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground space-y-1">
              <Bell aria-hidden="true" className="size-6 mx-auto opacity-30" />
              <p className="m-0 text-sm font-medium">
                {failed ? "Couldn't load notifications. Try again shortly." : "You're all caught up."}
              </p>
            </div>
          ) : (
            items.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                onSelect={() => void openAlert(alert)}
                className={`flex items-start gap-2.5 rounded-none p-3 cursor-pointer focus:bg-muted ${alert.read ? "" : "bg-muted/50"}`}
              >
                <div aria-hidden="true" className="p-1.5 rounded-full bg-muted border border-border mt-0.5 shrink-0">
                  <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="m-0 text-sm font-semibold text-foreground break-words">{alert.title}</p>
                  {alert.body && <p className="m-0 text-sm text-muted-foreground break-words">{alert.body}</p>}
                  <time dateTime={alert.createdAt} className="block text-xs text-muted-foreground">
                    {alertTime(alert.createdAt)}
                  </time>
                  {!alert.read && <span className="sr-only">Unread</span>}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {nextCursor && (
          <div className="p-1 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingMore}
              onClick={(e) => {
                e.preventDefault();
                void loadMore();
              }}
              className="w-full h-8 text-xs font-semibold"
            >
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load older"}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
