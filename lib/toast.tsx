"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";
import { AlertTriangle, CheckCircle, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The app's pop-up notifications: one branded card for every success, error and warning
 * (modelled on the "Order completed" card from Sales Processing). Same call shape as
 * sonner's `toast`, so `toast.success("Saved.")` keeps working; pass an object for
 * richer pop-ups:
 *
 *   toast.success({
 *     title: "Refund approved",
 *     meta: "ORD-20261111-0004 · −₱199.00",
 *     details: [{ label: "Ube Halaya Smooth (250g)", value: "+1 restocked", tone: "positive" }],
 *   });
 */

type Tone = "success" | "error" | "warning";

export type ToastDetail = {
  /** Plain label. Ignored when `item` is given. */
  label?: ReactNode;
  /** A product line: shown as aligned name / packaging / size columns. */
  item?: { name: string; packaging?: string; size?: string };
  value: ReactNode;
  tone?: "positive" | "negative" | "neutral";
};

export type ToastContent = {
  /** Bold first line, e.g. "ORD-20261111-0008 completed". */
  title: ReactNode;
  /** Small uppercase line under the title, e.g. "Total ₱199.00". */
  meta?: ReactNode;
  /** Optional rows (items restocked, amounts...). */
  details?: ToastDetail[];
  /** Optional sentence under the rows. */
  note?: ReactNode;
};

export type ToastMessage = string | ToastContent;

export type ToastOptions = {
  /** Milliseconds before it closes. Defaults: success 4.5s, errors and warnings 6s. */
  duration?: number;
  id?: string | number;
};

const TONE: Record<Tone, { icon: typeof CheckCircle; tile: string; bar: string; role: "status" | "alert" }> = {
  success: {
    icon: CheckCircle,
    tile: "bg-primary/10 border-primary/20 text-primary",
    bar: "bg-primary",
    role: "status",
  },
  error: {
    icon: XCircle,
    tile: "bg-destructive/10 border-destructive/20 text-destructive",
    bar: "bg-destructive",
    role: "alert",
  },
  warning: {
    icon: AlertTriangle,
    tile: "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    role: "alert",
  },
};

const DEFAULT_DURATION: Record<Tone, number> = { success: 4500, error: 6000, warning: 6000 };

const DETAIL_TONE: Record<NonNullable<ToastDetail["tone"]>, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-foreground",
};

function ToastCard({
  id,
  tone,
  content,
  duration,
}: {
  id: string | number;
  tone: Tone;
  content: ToastContent;
  duration: number;
}) {
  const { icon: Icon, tile, bar, role } = TONE[tone];
  // Long plain-text messages read better a size down than as one big bold block.
  const longTitle = typeof content.title === "string" && content.title.length > 70;

  return (
    <div
      role={role}
      className="group pointer-events-auto flex w-[360px] max-w-[calc(100vw-2rem)] gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", tile)}>
        <Icon className="h-7 w-7" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "m-0 break-words text-foreground",
              longTitle ? "text-sm font-semibold leading-snug" : "text-[15px] font-bold leading-snug",
            )}
          >
            {content.title}
          </p>
          <button
            type="button"
            onClick={() => sonner.dismiss(id)}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {content.meta && (
          <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground tabular-nums">
            {content.meta}
          </p>
        )}

        {content.details && content.details.length > 0 && (
          // One grid for all rows so packaging, size and value line up from row to row.
          <ul className="m-0 mt-3 grid list-none grid-cols-[minmax(0,1fr)_auto_auto_auto] items-baseline gap-x-2.5 gap-y-1.5 border-t border-border p-0 pt-2.5 text-xs">
            {content.details.map((detail, idx) => (
              <li key={idx} className="contents">
                {detail.item ? (
                  <>
                    <span className="min-w-0 break-words font-semibold text-foreground">{detail.item.name}</span>
                    <span className="whitespace-nowrap text-muted-foreground">{detail.item.packaging}</span>
                    <span className="whitespace-nowrap text-muted-foreground">{detail.item.size}</span>
                  </>
                ) : (
                  <span className="col-span-3 min-w-0 break-words text-muted-foreground">{detail.label}</span>
                )}
                <span className={cn("whitespace-nowrap text-right font-bold tabular-nums", DETAIL_TONE[detail.tone ?? "neutral"])}>
                  {detail.value}
                </span>
              </li>
            ))}
          </ul>
        )}

        {content.note && <p className="m-0 mt-2 text-xs text-muted-foreground">{content.note}</p>}

        {/* Time left before it closes; pauses while hovered, like the toast timer. */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full w-full origin-left rounded-full group-hover:[animation-play-state:paused]", bar)}
            style={{ animation: `toast-countdown ${duration}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}

function show(tone: Tone, message: ToastMessage, options?: ToastOptions) {
  const content: ToastContent = typeof message === "string" ? { title: message } : message;
  const duration = options?.duration ?? DEFAULT_DURATION[tone];
  return sonner.custom((id) => <ToastCard id={id} tone={tone} content={content} duration={duration} />, {
    duration,
    id: options?.id,
  });
}

export const toast = {
  success: (message: ToastMessage, options?: ToastOptions) => show("success", message, options),
  error: (message: ToastMessage, options?: ToastOptions) => show("error", message, options),
  warning: (message: ToastMessage, options?: ToastOptions) => show("warning", message, options),
  dismiss: (id?: string | number) => sonner.dismiss(id),
};
