"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { variationLabel } from "@/components/module-pos/utils";
import { CloseLineIcon } from "@/icons/index";
import { Order, refundableQuantity } from "@/components/module-pos/types";
import type { RefundItemDto } from "@/components/module-pos/api/api";
import { shrinkImage } from "./ConfirmDeliveryDialog";

interface RefundFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  reason: string;
  setReason: (reason: string) => void;
  /** `items` is undefined when the order has no per-item data; the server then refunds everything left. */
  onSubmit: (proofImage: string | undefined, items: RefundItemDto[] | undefined) => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;
  isMobile?: boolean;
}

export default function RefundFormDialog({
  isOpen,
  onClose,
  order,
  reason,
  setReason,
  onSubmit,
  primary,
  muted,
  border,
  text,
  cardBg,
  inputBg,
  isMobile,
}: RefundFormDialogProps) {
  const isWebOrder = order?.type?.toLowerCase() === "online" || ["e-commerce", "ecommerce"].includes(order?.source?.toLowerCase() ?? "");
  const isInstitutional = order?.type === "institutional";
  const isGcashInstitutional = isInstitutional && order?.paymentMethod?.toLowerCase() === "gcash";
  const isPaidInstitutional = isInstitutional &&
    ["cash", "gcash"].includes(order?.paymentMethod?.toLowerCase() ?? "");
  // Refunds go back to stock unless the reason says "(Unsellable)": the backend keys off
  // that text to skip the restock. Paid institutional orders are only refundable once
  // delivered, so their reasons are all about the goods received (none restock).
  // A shipped institutional order can only be
  // refunded as a failed delivery, which is restocked because Lalamove returns the goods.
  const isFailedDelivery = isInstitutional && order?.status === "shipped";
  const predefinedReasons = isWebOrder
    ? ["Item arrived damaged", "Wrong item received", "Item not as described", "Other"]
    : isFailedDelivery
    ? ["Item not delivered"]
    : isPaidInstitutional
    ? ["Damaged (Unsellable)", "Customization not followed (Unsellable)"]
    : ["Return (Sealed/Sellable Condition)", "Change of mind", "Damaged/Expired (Unsellable)"];
  // Paid institutional refunds and failed deliveries need a photo as proof.
  const requiresPhoto = isPaidInstitutional || isFailedDelivery;

  const [selectedOption, setSelectedOption] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setProofImage(null);
      setPhotoError("");
      // A failed delivery has only one possible reason, so pick it for them.
      if (isFailedDelivery) setReason("Item not delivered");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  // Units being returned, by line. Starts at everything that can still be refunded.
  const [quantities, setQuantities] = useState<number[]>([]);
  const lines = order?.items ?? [];
  // Orders that came back without item data can only be refunded whole.
  const itemized = lines.length > 0 && lines.every((item) => item.variationId != null);
  // A failed delivery returns the whole shipment.
  const canPickItems = itemized && !isFailedDelivery;
  const chosen = lines.map((item, idx) => (canPickItems ? quantities[idx] ?? 0 : refundableQuantity(item)));
  const chosenUnits = chosen.reduce((sum, qty) => sum + qty, 0);
  const refundAmount = itemized
    ? lines.reduce((sum, item, idx) => sum + item.price * chosen[idx], 0)
    : order?.total ?? 0;
  const remainingUnits = lines.reduce((sum, item) => sum + refundableQuantity(item), 0);
  const isPartial = itemized && chosenUnits < remainingUnits;
  const setQuantity = (idx: number, qty: number) =>
    setQuantities((prev) => lines.map((item, i) => (i === idx ? Math.max(0, Math.min(refundableQuantity(item), qty)) : prev[i] ?? 0)));

  const canSubmit = !!reason.trim() && !!selectedOption && (!requiresPhoto || !!proofImage) && !isProcessingPhoto && (!itemized || chosenUnits > 0);

  const submit = () => {
    if (!itemized) {
      onSubmit(proofImage ?? undefined, undefined);
      return;
    }
    // The same variation can appear on two lines; the server adds them up.
    const items = lines
      .map((item, idx) => ({ variationId: item.variationId as number, quantity: chosen[idx] }))
      .filter((item) => item.quantity > 0);
    onSubmit(proofImage ?? undefined, items);
  };

  // Pick the radio that matches the saved reason only when the dialog opens. Doing this on every
  // reason change undid a click on "Other" (which clears the reason so it can be typed), so
  // "Other" needed two clicks before its text box appeared.
  // Starts closed, so a dialog that mounts already open still picks up the saved reason.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuantities((order?.items ?? []).map(refundableQuantity));
      setSelectedOption(
        predefinedReasons.includes(reason)
          ? reason
          : reason.trim() !== "" && predefinedReasons.includes("Other") ? "Other" : ""
      );
    }
  }

  if (!isOpen || !order || !mounted) return null;

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: muted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: inputBg,
    color: text,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {isFailedDelivery ? "Failed Delivery Refund" : "Request Refund"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Order ID
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 select-none">
                {order.orderNumber || order.id}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Customer
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 select-none">
                {order.customer}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Amount to Refund
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-red-500 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 select-none tabular-nums">
                ₱{refundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {isPartial && <span className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400">of ₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
              </div>
            </div>

            {itemized && (
              <div className="sm:col-span-2 mt-2">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    Items to Refund <span className="text-red-500">*</span>
                  </span>
                  {canPickItems && (
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <button type="button" className="text-primary hover:underline" onClick={() => setQuantities(lines.map(refundableQuantity))}>All items</button>
                      <button type="button" className="text-gray-500 dark:text-gray-400 hover:underline" onClick={() => setQuantities(lines.map(() => 0))}>Clear</button>
                    </div>
                  )}
                </div>
                {isFailedDelivery && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">A failed delivery refunds the whole shipment.</p>
                )}
                <ul className="m-0 p-0 list-none rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                  {lines.map((item, idx) => {
                    const max = refundableQuantity(item);
                    const qty = chosen[idx];
                    const done = item.refundedQuantity ?? 0;
                    const waiting = item.pendingRefundQuantity ?? 0;
                    return (
                      <li key={idx} className="flex items-center justify-between gap-3 px-3.5 py-3">
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                            {item.name} <span className="font-normal text-gray-500 dark:text-gray-400">{variationLabel(item.variation)}</span>
                          </p>
                          <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each · bought {item.quantity}
                            {done > 0 && ` · ${done} already refunded`}
                            {waiting > 0 && ` · ${waiting} awaiting approval`}
                          </p>
                        </div>
                        {max === 0 ? (
                          <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">Nothing left to refund</span>
                        ) : canPickItems ? (
                          <div className="shrink-0 flex items-center gap-1.5" role="group" aria-label={`Units of ${item.name} to refund`}>
                            <button
                              type="button"
                              aria-label="One fewer"
                              disabled={qty <= 0}
                              onClick={() => setQuantity(idx, qty - 1)}
                              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-base font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              −
                            </button>
                            <span className="w-14 text-center text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                              {qty} / {max}
                            </span>
                            <button
                              type="button"
                              aria-label="One more"
                              disabled={qty >= max}
                              onClick={() => setQuantity(idx, qty + 1)}
                              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-base font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">{max}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {isPartial && chosenUnits > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Partial refund: only these items are refunded. An order can be refunded only once, so the rest of it can’t be refunded later.
                  </p>
                )}
              </div>
            )}

            <div className="sm:col-span-2 mt-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Reason for Refund <span className="text-red-500">*</span>
              </label>
              
              <div className="flex flex-col gap-3">
                {predefinedReasons.map((option) => (
                  <label 
                    key={option} 
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedOption === option 
                        ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="refund-reason" 
                      value={option}
                      checked={selectedOption === option}
                      onChange={(e) => {
                        setSelectedOption(e.target.value);
                        if (e.target.value !== "Other") {
                          setReason(e.target.value);
                        } else {
                          setReason("");
                        }
                      }}
                      className="w-4 h-4 accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option}</span>
                  </label>
                ))}
              </div>

              {selectedOption === "Other" && (
                <textarea
                  placeholder="Please specify the reason for this refund request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full mt-4 px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none border-gray-200 dark:border-gray-700"
                />
              )}
            </div>

            {requiresPhoto && (
              <div className="sm:col-span-2">
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Proof Photo <span className="text-red-500">*</span>
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {isFailedDelivery
                    ? "Required: Lalamove's failed-delivery screen or proof the item was returned. The items go back to stock once approved."
                    : "Required for paid institutional orders, e.g. a photo of the damaged item or the customization that wasn't followed."}
                </p>
                {proofImage ? (
                  <div className="flex items-start gap-3">
                    <img src={proofImage} alt="Refund proof" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <button type="button" onClick={() => setProofImage(null)} className="text-xs font-semibold text-red-600 hover:underline">
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 px-4 py-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {isProcessingPhoto ? "Processing photo..." : "Add a photo"}
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
                {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-start sm:justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm ${
              canSubmit
                ? "bg-red-500 hover:bg-red-600 cursor-pointer"
                : "bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Refund Request
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
