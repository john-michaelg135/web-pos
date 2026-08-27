"use client";

import React from "react";
import { MoreVertical, User, Shield, Activity, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";

export function SidebarProfileFooter() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-xl text-xs text-muted-foreground animate-pulse">
        Loading session...
      </div>
    );
  }

  const name = session.user.name ?? "User";
  const email = session.user.email ?? "";
  const role = session.role ?? "Staff/Employee";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer group">
            <div className="relative shrink-0">
              <Avatar className="w-11 h-11 border-2 border-border shadow-sm">
                <AvatarFallback className="text-sm bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-sidebar" title="Online" />
            </div>
            <div className="flex-1 overflow-hidden space-y-0.5">
              <p className="text-sm font-bold truncate text-sidebar-foreground leading-tight">{name}</p>
              <p className="text-xs font-medium text-muted-foreground truncate leading-tight">{role}</p>
            </div>
            <MoreVertical className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sidebar-foreground transition-colors" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 bg-popover border-border text-popover-foreground z-[99999] shadow-xl p-2" side="top" align="start">
          <div className="p-2 bg-muted/40 rounded-lg border border-border mb-2 flex items-center gap-2">
            <Avatar className="w-10 h-10 border border-border shrink-0">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-xs font-bold text-foreground truncate">{name}</span>
              <span className="text-[11px] text-muted-foreground truncate">{email}</span>
              <Badge variant="outline" className="text-[9px] w-fit mt-1 px-1.5 py-0 font-semibold">
                {role}
              </Badge>
            </div>
          </div>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem className="cursor-pointer text-xs font-medium gap-2 p-2 hover:bg-accent">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-xs font-medium gap-2 p-2 hover:bg-accent">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Security Options</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-xs font-medium gap-2 p-2 hover:bg-accent">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Activity Logs</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/signin";
            }}
            className="cursor-pointer text-xs font-medium gap-2 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
