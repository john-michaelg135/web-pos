import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const ModalCloseButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function ModalCloseButton({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label="Close"
        className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 sm:size-8 dark:text-gray-400 dark:hover:bg-gray-800", className)}
        {...props}
      >
        <X aria-hidden className="size-4" />
      </button>
    );
  },
);
