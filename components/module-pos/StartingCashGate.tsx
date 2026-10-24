"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { startingCashRule } from "@/lib/portal/roles";
import { apiClient } from "@/components/module-pos/api";
import { Button } from "@/components/ui/button";

interface StartingCashEntry {
  id: number;
  cashierName: string;
  locationId: number;
  locationName?: string | null;
  businessDate: string;
  amount: number;
  createdAt: string;
}

interface StartingCashGateProps {
  /** Branch this register operates on. */
  locationId: number;
  /** Tells the parent whether today's starting cash is recorded (gates selling). */
  onChange?: (declared: boolean) => void;
}

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Digits and a single decimal point, max 2 decimals. */
const sanitizeMoney = (raw: string) => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length === 0 ? whole : `${whole}.${rest.join("").slice(0, 2)}`;
};

const errorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  return fallback;
};

/**
 * Before a cashier sells, they declare the cash in the drawer. This component
 * blocks the page with a prompt until today's starting cash is recorded, then
 * shows a slim status bar.
 *
 * Rules:
 * The Role the Enterprise Portal returns decides (see startingCashRule):
 * - Super Admin and CEO: never prompted; selling is never blocked.
 * - Cashier, Manager and any unknown Role: mandatory daily prompt with no way to
 *   dismiss it; selling is blocked until declared.
 */
export default function StartingCashGate({ locationId, onChange }: StartingCashGateProps) {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const headers = {};

  const isSuperUser = startingCashRule(authUser?.role) === "exempt";

  const currentCashierName = authUser?.username || authUser?.email || "";

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<StartingCashEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Super Admin and CEO never need starting cash
  useEffect(() => {
    if (isSuperUser) onChange?.(true);
  }, [isSuperUser, onChange]);

  const apply = useCallback(
    (next: StartingCashEntry | null) => {
      setEntry(next);
      onChange?.(!!next || isSuperUser);
    },
    [onChange, isSuperUser]
  );

  const fetchToday = useCallback(async () => {
    if (isSuperUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.instance.get("/api-pos/starting-cash/today", {
        headers,
        params: {
          locationId,
          cashierName: currentCashierName || undefined,
        },
      });
      apply(res.data?.entry ?? null);
    } catch (err) {
      console.warn("Failed to load starting cash:", err);
      toast.error("Could not check today's starting cash.");
      apply(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, currentCashierName, apply, isSuperUser]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      toast.error("Enter the starting cash in the drawer (0 or more).");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.instance.post(
        "/api-pos/starting-cash",
        {
          locationId,
          amount: value,
          cashierName: currentCashierName || undefined,
        },
        { headers }
      );
      apply(res.data);
      setAmount("");
      toast.success(`Starting cash of ${peso(value)} recorded.`);
    } catch (err: any) {
      console.warn("Failed to record starting cash:", err?.message || "Unknown error");
      toast.error(errorMessage(err, "Failed to record starting cash."));
      fetchToday();
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const showPrompt =
    mounted &&
    !authLoading &&
    !loading &&
    !entry &&
    !isSuperUser;

  const prompt = showPrompt
    ? createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99998,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
              }}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 99999,
                width: "90%",
                maxWidth: 480,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e4e4e7",
                  flexShrink: 0,
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
                  Starting Cash
                </h2>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#71717a", lineHeight: 1.5 }}>
                  Before selling, count the cash in the drawer and enter it below. It is recorded under your name and
                  can&apos;t be edited afterwards.
                </p>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 6,
                    }}
                  >
                    Starting Cash (₱) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeMoney(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && !isSaving && handleSave()}
                    placeholder="e.g. 2000.00"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #e4e4e7",
                      backgroundColor: "#ffffff",
                      fontSize: 14,
                      color: "#18181b",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "12px 24px",
                  borderTop: "1px solid #e4e4e7",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#fafafa",
                  borderRadius: "0 0 12px 12px",
                  flexShrink: 0,
                }}
              >
                <Button
                  onClick={handleSave}
                  disabled={isSaving || amount === "" || amount === "."}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      {entry && (
        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            Starting cash recorded
          </span>
          <span className="text-muted-foreground">
            Amount: <strong className="text-foreground">{peso(entry.amount)}</strong>
          </span>
          <span className="text-muted-foreground">
            At {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
      {prompt}
    </>
  );
}
