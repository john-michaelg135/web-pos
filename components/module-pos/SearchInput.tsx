import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn("w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30", className)}
      {...props}
    />
  );
}
