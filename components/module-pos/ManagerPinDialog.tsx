import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

const COLORS = { border: "#e4e4e7", text: "#18181b", cardBg: "#ffffff" };

export const INCORRECT_PASSWORD_MESSAGE = "Incorrect password. Try again.";
export const VERIFICATION_UNAVAILABLE_MESSAGE = "Unable to verify your password. Please try again.";
const SESSION_EXPIRED_MESSAGE = "Your POS session has expired. Sign in again to view your PIN.";

export type PinRevealOutcome =
  | { ok: true; pinCode: string }
  | { ok: false; message: string };

/**
 * Asks api-pos to confirm the signed-in manager's account password and return their PIN.
 * The password travels only in the POST body; nothing is cached or stored.
 */
export async function revealManagerPin(password: string, signal: AbortSignal): Promise<PinRevealOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/pos/user-pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, message: VERIFICATION_UNAVAILABLE_MESSAGE };
  }

  let data: { pinCode?: unknown; message?: unknown } | null = null;
  try {
    data = (await response.json()) as { pinCode?: unknown; message?: unknown };
  } catch {
    data = null;
  }

  if (response.ok) {
    return typeof data?.pinCode === "string" && data.pinCode
      ? { ok: true, pinCode: data.pinCode }
      : { ok: false, message: VERIFICATION_UNAVAILABLE_MESSAGE };
  }
  if (response.status === 422) return { ok: false, message: INCORRECT_PASSWORD_MESSAGE };
  if (response.status === 401) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  if ((response.status === 400 || response.status === 403 || response.status === 429) && typeof data?.message === "string") {
    return { ok: false, message: data.message };
  }
  return { ok: false, message: VERIFICATION_UNAVAILABLE_MESSAGE };
}

type ManagerPinDialogProps = {
  onClose: () => void;
  reveal?: typeof revealManagerPin;
};

/**
 * Ticket #15: "View My PIN" first asks for the manager's account password. Mount it only while open,
 * so every opening starts with an empty password and no PIN.
 */
export default function ManagerPinDialog({ onClose, reveal = revealManagerPin }: ManagerPinDialogProps) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  // A verification that finishes after the dialog is dismissed must never show the PIN.
  useEffect(() => () => inFlight.current?.abort(), []);

  const close = () => {
    inFlight.current?.abort();
    inFlight.current = null;
    setPassword("");
    setPin(null);
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || inFlight.current) return;

    const controller = new AbortController();
    inFlight.current = controller;
    setIsVerifying(true);
    setError(null);
    try {
      const outcome = await reveal(password, controller.signal);
      if (controller.signal.aborted) return;
      setPassword("");
      if (outcome.ok) {
        setPin(outcome.pinCode);
      } else {
        setError(outcome.message);
        passwordRef.current?.focus();
      }
    } catch {
      if (controller.signal.aborted) return;
      setPassword("");
      setError(VERIFICATION_UNAVAILABLE_MESSAGE);
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setIsVerifying(false);
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-[90vw] sm:w-[400px] rounded-2xl shadow-xl border flex flex-col max-h-[90vh]"
        style={{ background: COLORS.cardBg, borderColor: COLORS.border }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b sticky top-0 z-10 rounded-t-2xl"
          style={{ borderColor: COLORS.border, background: COLORS.cardBg }}
        >
          <h2 id={titleId} className="text-xl font-bold" style={{ color: COLORS.text }}>
            {pin === null ? "Confirm your password" : "Manager PIN"}
          </h2>
          <ModalCloseButton onClick={close} />
        </div>

        {pin === null ? (
          <form onSubmit={submit} className="flex flex-col flex-1" noValidate>
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
              <p id={descriptionId} className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enter your account password to view your manager PIN.
              </p>
              <label htmlFor={`${titleId}-password`} className="block text-sm font-medium mb-1.5" style={{ color: COLORS.text }}>
                Account password
              </label>
              <Input
                ref={passwordRef}
                id={`${titleId}-password`}
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isVerifying}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error && (
                <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div
              className="p-4 sm:p-5 border-t mt-auto flex justify-end gap-3 sticky bottom-0 rounded-b-2xl"
              style={{ borderColor: COLORS.border, background: COLORS.cardBg }}
            >
              <Button type="button" variant="outline" className="rounded-lg border-border" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg" disabled={!password || isVerifying}>
                {isVerifying ? "Verifying…" : "Verify and view PIN"}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <p id={descriptionId} className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Use this PIN to approve Void and Refund requests. Keep this secure!
              </p>
              <div className="py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                <span className="text-3xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                  {pin}
                </span>
              </div>
            </div>
            <div
              className="p-4 sm:p-5 border-t mt-auto flex justify-end gap-3 sticky bottom-0 rounded-b-2xl"
              style={{ borderColor: COLORS.border, background: COLORS.cardBg }}
            >
              <Button type="button" variant="outline" className="rounded-lg border-border" onClick={close}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
