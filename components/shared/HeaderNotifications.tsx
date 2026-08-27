"use client";

import React from "react";
import { Bell, CheckCheck, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notifications = [
  {
    id: "1",
    title: "New Order Placed",
    description: "Order #1042 received — 5 items, ₱2,450.00",
    time: "5m ago",
    icon: ShoppingCart,
    unread: true,
  },
  {
    id: "2",
    title: "Low Stock Alert",
    description: "Ube Halaya 500g is below reorder level (3 remaining).",
    time: "30m ago",
    icon: AlertTriangle,
    unread: true,
  },
  {
    id: "3",
    title: "Stock Received",
    description: "Transfer #87 from Main Warehouse completed.",
    time: "2h ago",
    icon: Package,
    unread: false,
  },
];

export function HeaderNotifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative w-8 h-8 cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <Badge className="absolute top-1.5 right-1.5 w-2 h-2 p-0 bg-destructive rounded-full" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 bg-popover border-border text-popover-foreground z-[99999]" align="end">
        <div className="flex items-center justify-between p-2 border-b border-border">
          <DropdownMenuLabel className="p-0 text-body-sm font-bold text-foreground">
            Notifications
          </DropdownMenuLabel>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-label-sm text-muted-foreground hover:text-foreground">
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-2 p-2 cursor-pointer hover:bg-accent ${
                  n.unread ? "bg-accent/40 font-medium" : ""
                }`}
              >
                <div className="p-1 rounded-full bg-muted border border-border mt-0.5 shrink-0">
                  <Icon className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-label-sm font-semibold text-foreground truncate">{n.title}</span>
                    <span className="text-label-sm text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-label-sm text-muted-foreground line-clamp-2">{n.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-border m-0" />
        <div className="p-1 text-center">
          <Button variant="ghost" size="sm" className="w-full h-8 text-label-sm font-semibold text-foreground hover:bg-accent">
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
