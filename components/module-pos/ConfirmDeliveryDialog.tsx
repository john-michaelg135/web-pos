"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseLineIcon } from "@/icons/index";
import { DeliveryConfirmation, DeliveryConfirmationInput, Order } from "@/components/module-pos/types";

// Proof photos are shrunk in the browser so a phone photo (several MB) is stored as ~100–300 KB.
const PROOF_MAX_SIDE = 1280;
const PROOF_JPEG_QUALITY = 0.75;

export async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't an image we can read."));
      el.src = url;
    });
    const scale = Math.min(1, PROOF_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process the photo.");
    // JPEG has no transparency; paint white so transparent screenshots don't turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", PROOF_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Value for <input type="datetime-local"> in the viewer's own time zone.
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 border-gray-200 dark:border-gray-700";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

interface ConfirmDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSubmit: (details: DeliveryConfirmationInput) => Promise<boolean>;
}

export function ConfirmDeliveryDialog({ isOpen, onClose, order, onSubmit }: ConfirmDeliveryDialogProps) {
  const [receivedBy, setReceivedBy] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [courierReference, setCourierReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setReceivedBy("");
    setDeliveredAt(toLocalInputValue(new Date()));
    setCourierReference("");
    setNotes("");
    setProofImage(null);
    setPhotoError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const now = new Date();
  const orderPlaced = order.createdAt ? new Date(order.createdAt) : null;
  const deliveredDate = deliveredAt ? new Date(deliveredAt) : null;
  // Whole minutes: the picker has no seconds, so allow the minute the order was placed in.
  const dateError = !deliveredDate || isNaN(deliveredDate.getTime())
    ? "Enter when the order was delivered."
    : deliveredDate.getTime() > now.getTime() + 60_000
    ? "Delivered on can't be in the future."
    : orderPlaced && deliveredDate.getTime() < orderPlaced.getTime() - 60_000
    ? "Delivered on can't be before the order date."
    : "";
  const canSubmit = receivedBy.trim().length > 0 && !dateError && !isProcessingPhoto && !isSubmitting;

  const handlePhoto = async (file: File | undefined) => {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file (JPG, PNG or a screenshot).");
      return;
    }
    setIsProcessingPhoto(true);
    try {
      setProofImage(await shrinkImage(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't process the photo.");
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !deliveredDate) return;
    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        receivedBy: receivedBy.trim(),
        deliveredAt: deliveredDate.toISOString(),
        courierReference: courierReference.trim() || undefined,
        proofImage: proofImage ?? undefined,
        notes: notes.trim() || undefined,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-[32rem] sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white m-0">Confirm Delivery</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">{order.orderNumber || order.id} · {order.customer}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-2 shrink-0 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <CloseLineIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div>
            <label htmlFor="delivery-received-by" className={labelClass}>
              Received by <span className="text-red-500">*</span>
            </label>
            <input
              id="delivery-received-by"
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              maxLength={150}
              placeholder="Name of the customer or staff who received it"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="delivery-delivered-at" className={labelClass}>
              Delivered on <span className="text-red-500">*</span>
            </label>
            <input
              id="delivery-delivered-at"
              type="datetime-local"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              min={orderPlaced ? toLocalInputValue(orderPlaced) : undefined}
              max={toLocalInputValue(now)}
              className={inputClass}
            />
            {dateError && deliveredAt && <p className="text-xs text-red-500 mt-1 m-0">{dateError}</p>}
          </div>

          <div>
            <label htmlFor="delivery-courier-ref" className={labelClass}>Courier reference</label>
            <input
              id="delivery-courier-ref"
              type="text"
              value={courierReference}
              onChange={(e) => setCourierReference(e.target.value)}
              maxLength={500}
              placeholder="Lalamove booking ID or tracking link"
              className={inputClass}
            />
          </div>

          <div>
            <span className={labelClass}>Proof photo</span>
            {proofImage ? (
              <div className="flex items-start gap-3">
                <img src={proofImage} alt="Proof of delivery" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <button
                  type="button"
                  onClick={() => setProofImage(null)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 px-4 py-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {isProcessingPhoto ? "Processing photo..." : "Add a photo"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Lalamove proof-of-delivery screenshot or a photo of the signed receipt
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isProcessingPhoto}
                  onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
            )}
            {photoError && <p className="text-xs text-red-500 mt-1 m-0">{photoError}</p>}
          </div>

          <div>
            <label htmlFor="delivery-notes" className={labelClass}>Notes</label>
            <textarea
              id="delivery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Anything worth remembering about this delivery"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700 sm:justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface DeliveryConfirmationDetailsProps {
  orderId: string;
  confirmation: DeliveryConfirmation;
  border: string;
  muted: string;
  text: string;
}

// Read-only record shown on a completed institutional order.
export function DeliveryConfirmationDetails({ orderId, confirmation, border, muted, text }: DeliveryConfirmationDetailsProps) {
  const courierRef = confirmation.courierReference;
  const courierIsLink = !!courierRef && /^https?:\/\//i.test(courierRef);

  const row = (label: string, value: React.ReactNode) => (
    <p className="text-sm font-bold flex justify-between gap-3 m-0" style={{ color: text }}>
      <span className="shrink-0" style={{ color: muted, fontWeight: 600 }}>{label}:</span>
      <span className="text-right min-w-0 break-words [overflow-wrap:anywhere]">{value}</span>
    </p>
  );

  return (
    <div className="p-4 rounded-xl border mb-8 flex flex-col sm:flex-row gap-4" style={{ borderColor: border, background: `${border}10` }}>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <p className="text-xs font-black uppercase tracking-wider m-0 mb-1" style={{ color: text }}>Delivery Confirmation</p>
        {row("Received by", confirmation.receivedBy)}
        {row("Delivered on", new Date(confirmation.deliveredAt).toLocaleString())}
        {courierRef && row("Courier ref.", courierIsLink
          ? <a href={courierRef} target="_blank" rel="noopener noreferrer" className="underline">{courierRef}</a>
          : courierRef)}
        {row("Confirmed by", `${confirmation.confirmedByName || (confirmation.confirmedBy ? `User #${confirmation.confirmedBy}` : "Unknown")} · ${new Date(confirmation.confirmedAt).toLocaleString()}`)}
        {confirmation.notes && (
          <p className="text-xs mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 m-0 break-words [overflow-wrap:anywhere]" style={{ color: text }}>
            {confirmation.notes}
          </p>
        )}
      </div>

      {confirmation.hasProofImage && (
        <ProofPhoto
          src={`/api/pos/order-management/orders/${orderId}/delivery-proof`}
          alt="Proof of delivery"
          border={border}
          muted={muted}
        />
      )}
    </div>
  );
}

interface ProofPhotoProps {
  /** Endpoint returning `{ proofImage: dataUrl }`. */
  src: string;
  alt: string;
  border: string;
  muted: string;
}

// Proof photos aren't in the order list (they'd make it heavy), so each loads on demand.
// Tap the thumbnail to see it full size.
export function ProofPhoto({ src, alt, border, muted }: ProofPhotoProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPhoto(null);
    setFailed(false);
    fetch(src, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { proofImage?: string };
        setPhoto(data.proofImage ?? null);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [src]);

  return (
    <div className="shrink-0">
      {photo ? (
        <button type="button" onClick={() => setShowFull(true)} className="block w-full" aria-label={`View ${alt.toLowerCase()} full size`}>
          <img src={photo} alt={alt} className="w-full sm:w-32 h-40 sm:h-32 object-cover rounded-lg border" style={{ borderColor: border }} />
        </button>
      ) : (
        <div className="w-full sm:w-32 h-32 rounded-lg border flex items-center justify-center text-xs text-center px-2" style={{ borderColor: border, color: muted }}>
          {failed ? "Couldn't load photo" : "Loading photo..."}
        </div>
      )}

      {showFull && photo && createPortal(
        <div
          onClick={() => setShowFull(false)}
          className="fixed inset-0 z-[100010] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={photo} alt={alt} className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>,
        document.body
      )}
    </div>
  );
}
