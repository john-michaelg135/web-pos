"use client";

import React, { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

const LOGOUT_PATH = "/api/portal/logout";

export function SidebarProfileFooter() {
  const { user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const { name, role } = user;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-background p-3 shadow-xs">
        <Avatar className="size-11 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-bold leading-tight text-foreground">{name}</p>
          <Badge variant="secondary" className="mt-1 w-fit px-2 py-0 text-[11px] font-semibold">
            {role}
          </Badge>
        </div>
      </div>

      {/* The dialog's button submits this form; disabling a button in its own onClick would cancel the submission. */}
      <form id="logout-form" action={LOGOUT_PATH} method="post" onSubmit={() => setLoggingOut(true)} />
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <LogOut aria-hidden />
            Log out
          </Button>
        </DialogTrigger>
        <DialogContent
          onEscapeKeyDown={(event) => loggingOut && event.preventDefault()}
          onInteractOutside={(event) => loggingOut && event.preventDefault()}
          className="max-w-110"
        >
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will be signed out of the Enterprise Portal and every system you opened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loggingOut}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" form="logout-form" disabled={loggingOut}>
              {loggingOut && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {loggingOut ? "Signing out…" : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
