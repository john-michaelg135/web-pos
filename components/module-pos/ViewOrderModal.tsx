"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseLineIcon, CheckCircleIcon } from "@/icons/index";
import { DeliveryConfirmationInput, Order, STATUS_LABELS, OrderStatus } from "@/components/module-pos/types";
import { ConfirmDeliveryDialog, DeliveryConfirmationDetails } from "./ConfirmDeliveryDialog";
import { renderVariationBadges } from "./utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

interface ViewOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  onStatusUpdate?: (status: OrderStatus) => Promise<boolean | void>;
  onCompletePayment?: () => Promise<boolean | void>;
  onConfirmDelivery?: (details: DeliveryConfirmationInput) => Promise<boolean>;
  onRequestRefund?: () => void;
onRequestVoid?: () => void;
onApplyVoid?: () => void;
onRejectVoid?: () => void;
  onApplyRefund?: () => void;
  onRejectRefund?: () => void;
}

export function ViewOrderModal({
  order,
  isOpen,
  onClose,
  primary,
  muted,
  border,
  text,
  cardBg,
  onStatusUpdate,
  onCompletePayment,
  onConfirmDelivery,
  onRequestRefund,
onRequestVoid,
onApplyVoid,
onRejectVoid,
  onApplyRefund,
  onRejectRefund,
}: ViewOrderModalProps) {
  const { can } = useAuth();
  const handleStatusChange = async (status: OrderStatus) => {
    if (onStatusUpdate) {
      await onStatusUpdate(status);
    }
  };

  const [tempStatus, setTempStatus] = useState<OrderStatus>(order.status);
  const [mounted, setMounted] = useState(false);
  const [statusToConfirm, setStatusToConfirm] = useState<OrderStatus | null>(null);
  const [cancelToConfirm, setCancelToConfirm] = useState(false);
  const [completePaymentToConfirm, setCompletePaymentToConfirm] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTempStatus(order.status);
    }
  }, [order.status, order.id, isOpen]);

  // Granular RBAC (br-auth "Order Management" module):
  //   approve  → can approve/reject refund requests (manager capability)
  //   update   → can change order status directly (manager capability)
  //   write    → can file a refund request (cashier capability)
  const canApproveRefund = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const canRejectRefund = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const canRequestRefund = can(POS_MODULES.ORDER_MANAGEMENT, "write");
  const canRequestVoid = can(POS_MODULES.ORDER_MANAGEMENT, "write");
  const canApproveVoid = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const canRejectVoid = can(POS_MODULES.ORDER_MANAGEMENT, "approve");
  const _canRequestRefund_unused = can(POS_MODULES.ORDER_MANAGEMENT, "write");
  const isAuthorizedToEdit = can(POS_MODULES.ORDER_MANAGEMENT, "update");

  const isWebOrder = order.type === "online" || order.source?.toLowerCase() === "e-commerce" || order.source?.toLowerCase() === "ecommerce";
  const isInstitutional = order.type === "institutional";
  const isPwdOrder = !!order.seniorPwdId;

  const isPartiallyPaid = order.paymentStatus === "partial";
  const amountPaid = order.amountPaid ?? 0;
  const remainingBalance = Math.max(0, order.total - amountPaid);
  const showPaymentSummary = isInstitutional && order.paymentMethod?.toLowerCase() === "gcash";

  // Shipped institutional orders are completed through Confirm Delivery so the proof is recorded.
  const canConfirmDelivery = isInstitutional && order.status === "shipped" && isAuthorizedToEdit && !isPartiallyPaid && !!onConfirmDelivery;

  // A partially paid order cannot move to Paid or beyond until the balance is confirmed.
  const allowedStatuses = (isWebOrder
    ? ["processing", "shipped", "delivered"]
    : isInstitutional
    ? ["processing", "paid", "shipped", "completed"]
    : ["processing", "completed"] // walk-in / store
  )
    .filter((s) => !isPartiallyPaid || !["paid", "shipped", "completed"].includes(s))
    .filter((s) => !(isInstitutional && order.status === "shipped" && s === "completed")) as OrderStatus[];

  const pricing = useMemo(() => {
    if (!isPwdOrder) {
      return {
        subtotal: order.total,
        vatExempt: 0,
        discount: 0,
        total: order.total
      };
    }

    let originalSubtotal = 0;
    let vatExemptTotal = 0;

    order.items.forEach(item => {
      const discountedPrice = item.price;
      const originalPrice = Math.round((discountedPrice * 1.12 / 0.80) * 100) / 100;
      const vatExemptPrice = Math.round((originalPrice / 1.12) * 100) / 100;

      const qty = item.quantity;
      originalSubtotal += originalPrice * qty;
      vatExemptTotal += (originalPrice - vatExemptPrice) * qty;
    });

    const discountTotal = originalSubtotal - vatExemptTotal - order.total;

    return {
      subtotal: originalSubtotal,
      vatExempt: vatExemptTotal,
      discount: discountTotal,
      total: order.total
    };
  }, [order, isPwdOrder]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div
          className="w-full max-w-4xl sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-xl border flex flex-col h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 duration-300"
        style={{ background: cardBg, borderColor: border }}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:py-4 border-b sticky top-0 z-10 rounded-t-3xl sm:rounded-t-2xl"
          style={{ borderColor: border, background: cardBg }}
        >
          {/* Grab handle, phones only */}
          <span aria-hidden className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
            <p className="sm:hidden text-[11px] font-semibold uppercase tracking-wider m-0" style={{ color: muted }}>Manage order</p>
            <h2 className="text-base sm:text-xl font-bold truncate" style={{ color: text }}>
              <span className="hidden sm:inline">Manage Order </span>{order.orderNumber || order.id}
            </h2>
            <span
              className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              style={
                // Shipped orders use the institutional (indigo) badge colour, as in the order list.
                order.status === "shipped"
                  ? {
                      background: "var(--badge-indigo)",
                      color: "var(--badge-indigo-foreground)",
                      border: "1px solid color-mix(in oklch, var(--badge-indigo-foreground) 20%, transparent)",
                    }
                  : {
                      background: `${primary}15`,
                      color: primary,
                      border: `1px solid ${primary}30`,
                    }
              }
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 sm:p-1.5 shrink-0 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <CloseLineIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          {/* Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="p-4 rounded-xl border flex flex-col gap-1 min-w-0" style={{ borderColor: border, background: `${border}10` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: muted }}>Customer Details</p>
              <p className="text-sm font-bold break-words [overflow-wrap:anywhere]" style={{ color: text }}>{order.customer}</p>
              {isPwdOrder ? (
                <>
                  {order.seniorPwdStreet && (
                    <p className="text-xs font-semibold break-words [overflow-wrap:anywhere]" style={{ color: muted }}>
                      Address: <span style={{ color: text }}>
                        {`${order.seniorPwdStreet}, ${order.seniorPwdBarangay || ""}, ${order.seniorPwdCity || ""}, ${order.seniorPwdProvince || ""} ${order.seniorPwdZipCode || ""}`.replace(/,\s*,/g, ",").trim()}
                      </span>
                    </p>
                  )}
                  <p className="text-xs font-semibold break-words [overflow-wrap:anywhere]" style={{ color: muted }}>
                    PWD ID: <span style={{ color: text }}>{order.seniorPwdId}</span>
                  </p>
                </>
              ) : (
                <>
                  {order.deliveryAddress && (
                    <p className="text-xs font-semibold break-words [overflow-wrap:anywhere]" style={{ color: muted }}>
                      Address: <span style={{ color: text }}>{order.deliveryAddress}</span>
                    </p>
                  )}
                </>
              )}

            </div>
            <div className="p-4 rounded-xl border min-w-0" style={{ borderColor: border, background: `${border}10` }}>
              <p className="text-[10px] font-bold uppercase mb-1 tracking-wider" style={{ color: muted }}>Order Information</p>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-bold flex justify-between gap-3" style={{ color: text }}>
                  <span className="shrink-0" style={{ color: muted, fontWeight: 600 }}>Type:</span>
                  <span className="uppercase text-right min-w-0 break-words [overflow-wrap:anywhere]">{order.type} {order.isPreOrder ? "(Pre-order)" : ""}</span>
                </p>
                <p className="text-sm font-bold flex justify-between gap-3" style={{ color: text }}>
                  <span className="shrink-0" style={{ color: muted, fontWeight: 600 }}>Date:</span>
                  <span className="text-right min-w-0 break-words [overflow-wrap:anywhere]">{order.date}</span>
                </p>
                <p className="text-sm font-bold flex justify-between gap-3" style={{ color: text }}>
                  <span className="shrink-0" style={{ color: muted, fontWeight: 600 }}>Location:</span>
                  <span className="text-right min-w-0 break-words [overflow-wrap:anywhere]">{order.location}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Xendit Payment Details */}
          {order.paymentUrl && (
            <div
              className="p-5 rounded-xl border mb-8 flex flex-col sm:flex-row items-center justify-between gap-6"
              style={{ borderColor: border, background: `linear-gradient(135deg, ${primary}0A, ${primary}15)` }}
            >
              {order.paymentStatus?.toLowerCase() === "paid" ? (
                <div className="flex items-center gap-4 w-full py-2 px-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border"
                    style={{ borderColor: `${primary}30`, background: `${primary}10`, color: primary }}
                  >
                    <CheckCircleIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider m-0" style={{ color: primary }}>
                      Cashless Payment Confirmed
                    </h4>
                    <p className="text-xs mt-1 m-0 text-gray-500 dark:text-gray-400">
                      The transaction was successfully processed and confirmed paid via Xendit.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 w-full">
                    <h4 className="text-xs font-bold uppercase mb-2 tracking-wider animate-pulse" style={{ color: primary }}>
                      Xendit Cashless Payment Link
                    </h4>
                    <p className="text-xs mb-4" style={{ color: muted }}>
                      Scan the QR code to pay via E-Wallet, Card, or QR PH, or copy the checkout URL to send to the customer.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        value={order.paymentUrl}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none font-mono"
                        style={{ background: cardBg, borderColor: border, color: muted }}
                      />
                      <button
                        onClick={() => {
                          if (order.paymentUrl) {
                            navigator.clipboard.writeText(order.paymentUrl);
                            toast.success("Payment URL copied to clipboard!");
                          }
                        }}
                        className="px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors border active:scale-95"
                        style={{
                          borderColor: `${primary}50`,
                          background: `${primary}1A`,
                          color: primary
                        }}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  <div
                    className="p-3 bg-white rounded-xl border flex flex-col items-center justify-center shadow-sm shrink-0"
                    style={{ borderColor: border }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(order.paymentUrl)}`}
                      alt="Cashless Payment QR Code"
                      className="w-[140px] h-[140px]"
                    />
                    <span className="text-[9px] font-bold uppercase mt-2 text-gray-500 tracking-wider">
                      Scan to Pay
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Institutional GCash payment summary (50% downpayment or full) */}
          {showPaymentSummary && (
            <div className="p-4 rounded-xl border mb-8 flex flex-col gap-3" style={{ borderColor: border, background: `${border}10` }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider m-0" style={{ color: text }}>GCash Payment</p>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={order.paymentStatus === "paid"
                    ? { color: primary, borderColor: `${primary}50`, background: `${primary}1A` }
                    : isPartiallyPaid
                    ? { color: "#b45309", borderColor: "#f59e0b66", background: "#f59e0b1a" }
                    : { color: "#dc2626", borderColor: "#dc262666", background: "#dc26261a" }}
                >
                  {order.paymentStatus === "paid"
                    ? "Fully Paid"
                    : isPartiallyPaid
                    ? `Downpayment (${order.total > 0 ? Math.round((amountPaid / order.total) * 100) : 0}%)`
                    : "Unpaid"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-[13px] sm:text-sm tabular-nums">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: muted }}>Total</p>
                  <p className="font-bold m-0" style={{ color: text }}>₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: muted }}>Amount Paid</p>
                  <p className="font-bold m-0" style={{ color: text }}>₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: muted }}>Balance</p>
                  <p className="font-bold m-0" style={{ color: remainingBalance > 0 ? "#dc2626" : text }}>₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              {isPartiallyPaid && onCompletePayment && !["cancelled", "rejected", "void_requested", "voided", "refund_requested", "refunded"].includes(order.status) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-3" style={{ borderColor: border }}>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                    Click once the remaining balance has reflected in the company GCash wallet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCompletePaymentToConfirm(true)}
                    disabled={isCompletingPayment}
                    className="px-4 py-2 text-xs font-black uppercase rounded-lg text-white active:scale-95 transition-all whitespace-nowrap disabled:opacity-60"
                    style={{ background: primary }}
                  >
                    Complete Payment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Institutional: record proof of delivery and complete the order */}
          {canConfirmDelivery && (
            <div className="p-4 rounded-xl border mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: `${primary}40`, background: `${primary}0D` }}>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black uppercase tracking-wider m-0" style={{ color: text }}>Delivered?</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                  Record who received it, with the Lalamove proof or a signed receipt, to complete the order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmDelivery(true)}
                className="px-4 py-2 text-xs font-black uppercase rounded-lg text-white active:scale-95 transition-all whitespace-nowrap"
                style={{ background: primary }}
              >
                Confirm Delivery
              </button>
            </div>
          )}

          {order.deliveryConfirmation && (
            <DeliveryConfirmationDetails
              orderId={order.id}
              confirmation={order.deliveryConfirmation}
              border={border}
              muted={muted}
              text={text}
            />
          )}

          {/* Direct Status Changer (Admin / Order Manager / dev) */}
          {isAuthorizedToEdit && order.status !== "refund_requested" && order.status !== "refunded" && order.status !== "rejected" && order.status !== "cancelled" && (
            <div className="p-4 rounded-xl border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: border, background: `${border}10` }}>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <p className="text-xs font-black uppercase tracking-wider m-0" style={{ color: text }}>Change Order Status</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">Directly transition this order to another valid delivery status.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <CustomSelect
                  value={tempStatus}
                  onChange={(val) => setTempStatus(val as OrderStatus)}
                  className="w-full sm:w-auto"
                  options={allowedStatuses.map((val) => ({
                    value: val,
                    label: STATUS_LABELS[val]
                  }))}
                />
                <button
                  onClick={() => {
                    if (tempStatus === order.status) {
                      toast.error("Please select a different status to update.");
                      return;
                    }
                    setStatusToConfirm(tempStatus);
                  }}
                  className="px-4 py-2 text-xs font-black uppercase rounded-lg transition-colors border active:scale-95 whitespace-nowrap w-full sm:w-auto"
                  style={{ borderColor: `${primary}50`, background: `${primary}1A`, color: primary }}
                >
                  Update Status
                </button>
              </div>
            </div>
          )}

          {/* Items Section */}
          <div>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: muted }}>Order Items</h3>
            <ul className="sm:hidden rounded-xl border divide-y m-0 p-0 list-none" style={{ borderColor: border }}>
              {order.items.map((item, idx) => (
                <li key={idx} className="px-4 py-3 flex flex-col gap-1.5" style={{ borderColor: border }}>
                  <p className="text-sm font-bold m-0 break-words" style={{ color: text }}>{item.name}</p>
                  <div>{renderVariationBadges(item.variation, muted, border, cardBg, true)}</div>
                  <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
                    <span style={{ color: muted }}>
                      {item.quantity} × ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="font-bold" style={{ color: text }}>
                      ₱{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block rounded-xl border overflow-hidden" style={{ borderColor: border }}>
              <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "120px" }} />
                </colgroup>
                <thead style={{ background: `${border}20` }}>
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-left" style={{ color: muted }}>Item</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-left" style={{ color: muted }}>Qty</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-left" style={{ color: muted }}>Price</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-left" style={{ color: muted }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: border }}>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold" style={{ color: text }}>{item.name}</p>
                        <div style={{ marginTop: 2 }}>
                          {renderVariationBadges(item.variation, muted, border, cardBg, true)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-left" style={{ color: text }}>
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-left" style={{ color: muted }}>
                        ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-left" style={{ color: text }}>
                        ₱{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.customVariationNotes && (
              <div
                className="mt-4 p-3 rounded-lg border"
                style={{ borderColor: border, background: `${border}10` }}
              >
                <p className="text-[10px] font-bold uppercase mb-1 tracking-wider" style={{ color: muted }}>Customization</p>
                <p className="text-xs font-medium break-words [overflow-wrap:anywhere]" style={{ color: text }}>{order.customVariationNotes}</p>
              </div>
            )}

            {order.remarks && (
              <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
                <p className="text-[10px] font-bold uppercase text-red-500 mb-1 tracking-wider">Remarks / Reason</p>
                <p className="text-xs font-medium text-red-700 dark:text-red-400 break-words [overflow-wrap:anywhere]">{order.remarks}</p>
              </div>
            )}
          </div>

          {/* Status History Logs Timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="mt-8 border-t pt-8" style={{ borderColor: border }}>
              <h3 className="text-xs font-bold mb-5 uppercase tracking-wider" style={{ color: muted }}>Status History Log</h3>
              <div className="relative border-l border-dashed ml-3 pl-6 flex flex-col gap-6" style={{ borderColor: border }}>
                {order.statusHistory.map((history, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline Node dot */}
                    <div
                      className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border bg-white dark:bg-gray-900"
                      style={{ borderColor: primary }}
                    />
                    <p className="text-sm font-bold m-0" style={{ color: text }}>
                      {STATUS_LABELS[history.oldStatus.toLowerCase() as OrderStatus] || history.oldStatus} → {STATUS_LABELS[history.newStatus.toLowerCase() as OrderStatus] || history.newStatus}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 m-0">
                      {new Date(history.createdAt).toLocaleString()} {history.changedBy ? `by User #${history.changedBy}` : "(System)"}
                    </p>
                    {history.remarks && (
                      <p className="text-xs mt-1 italic p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 m-0" style={{ color: text }}>
                        {history.remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div className="mt-8 flex justify-start">
            <div className="w-full sm:w-1/2 p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: border, background: `${border}10` }}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>Subtotal</span>
                <span className="text-sm font-bold" style={{ color: text }}>₱{pricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {isPwdOrder && (
                <>
                  <div className="flex justify-between items-center text-red-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">VAT Exemption (12%)</span>
                    <span className="text-sm font-bold">- ₱{pricing.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Senior/PWD Discount (20%)</span>
                    <span className="text-sm font-bold">- ₱{pricing.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: border }}>
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: text }}>Total Price</span>
                <span className="text-2xl font-bold" style={{ color: primary }}>
                  ₱{pricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {order.amountTendered != null && (
                <>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Amount Paid (Cash)</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      ₱{order.amountTendered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-dashed border-gray-300 dark:border-gray-600 mt-1 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Change</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      ₱{(order.changeAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 border-t sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 sm:rounded-b-2xl no-print"
          style={{ borderColor: border }}
        >
          {/* Actions Left: Cancel / Refund / Review Refund */}
          <div className="grid grid-cols-2 gap-2 empty:hidden sm:flex sm:items-center [&>button]:w-full sm:[&>button]:w-auto [&>button]:py-2.5 sm:[&>button]:py-2 [&>button:only-child]:col-span-2">
            {/* Cancel Order Button: managers and administrators only; cashiers may not cancel orders */}
            {isAuthorizedToEdit && ["pending", "awaiting_stock", "processing", "paid", "shipped", "ready_for_delivery"].includes(order.status) && onStatusUpdate && (
              <button
                onClick={() => setCancelToConfirm(true)}
                className="px-4 py-2 text-xs font-bold uppercase text-red-600 border border-red-500/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
              >
                Cancel Order
              </button>
            )}

            {/* Request Void Button (For pending/completed orders) */}
            {canRequestVoid && !["void_requested", "voided", "refund_requested", "refunded", "cancelled", "rejected"].includes(order.status) && onRequestVoid && (
              <button
                onClick={onRequestVoid}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-orange-600 rounded-lg hover:bg-orange-700 active:scale-95 transition-all shadow-sm"
              >
                Request Void
              </button>
            )}

            {/* Approve Void */}
            {order.status === "void_requested" && onApplyVoid && canApproveVoid && (
              <button
                onClick={onApplyVoid}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
              >
                Approve Void
              </button>
            )}

            {/* Reject Void */}
            {order.status === "void_requested" && onRejectVoid && canRejectVoid && (
              <button
                onClick={onRejectVoid}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Reject Void
              </button>
            )}

            {/* Request Refund Button: cashier capability (Order Management write). Visible if order paid/completed. */}
            {canRequestRefund && (order.status === "completed" || order.paymentStatus === "paid") && !["refund_requested", "refunded", "cancelled", "rejected", "void_requested", "voided"].includes(order.status) && onRequestRefund && (
              <button
                onClick={onRequestRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Request Refund
              </button>
            )}

            {/* Approve Refund Button: manager capability (Order Management approve) when status is refund_requested */}
            {order.status === "refund_requested" && onApplyRefund && canApproveRefund && (
              <button
                onClick={onApplyRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
              >
                Approve Refund
              </button>
            )}

            {/* Reject Refund Button: manager capability (Order Management approve) when status is refund_requested */}
            {order.status === "refund_requested" && onRejectRefund && canRejectRefund && (
              <button
                onClick={onRejectRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Reject Refund
              </button>
            )}
          </div>

          {/* Actions Right: Waybill & Close */}
          <div className="flex items-center gap-2 sm:ml-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            {isWebOrder && (
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-250 border transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                style={{ borderColor: border }}
              >
                Print Waybill
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-sm cursor-pointer"
              style={{ background: primary }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Waybill Area */}
        {createPortal(
          <div id="waybill-print-root">
        <div id="printable-waybill" className="hidden p-8 bg-white text-black font-sans w-full max-w-[800px] mx-auto">
          <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">DELIVERY WAYBILL</h1>
              <p className="text-sm font-bold text-gray-600 mt-1">Order Ref: <span className="font-mono text-black">{order.id}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Date: {order.date}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black uppercase rounded tracking-wider">
                {order.type}
              </span>
              <p className="text-xs font-bold text-gray-500 mt-2">Location: {order.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Delivery Recipient</p>
              <p className="text-sm font-black text-black">{order.customer}</p>
              <p className="text-xs text-gray-700 mt-1">Status: <span className="font-bold uppercase">{order.paymentStatus === 'paid' ? 'Paid' : 'COD (Pending)'}</span></p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Payment Method</p>
              <p className="text-sm font-black uppercase text-black">{isWebOrder ? 'Cashless COD / E-Wallet / Card' : 'COD'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-black rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="px-4 py-2 text-xs font-bold uppercase text-black">Item Description</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-center text-black w-20">Qty</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-right text-black w-28">Price</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-right text-black w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-black">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.variation}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-center text-black">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-black">
                      ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-black">
                      ₱{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-start gap-8">
            <div className="w-1/2">
              {order.remarks && (
                <div className="p-3 bg-gray-100 rounded-lg border border-dashed border-gray-400">
                  <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Notes / Remarks</p>
                  <p className="text-xs text-gray-700 font-medium">{order.remarks}</p>
                </div>
              )}
            </div>

            <div className="w-1/2 flex flex-col items-end">
              <div className="w-full border-t border-black pt-3 flex flex-col gap-1 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Subtotal</span>
                  <span>₱{pricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {isPwdOrder && (
                  <>
                    <div className="flex justify-between text-red-600">
                      <span>VAT Exemption (12%)</span>
                      <span>- ₱{pricing.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Senior/PWD Discount (20%)</span>
                      <span>- ₱{pricing.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-black pt-2 flex justify-between font-black text-base">
                  <span>Total Price</span>
                  <span>₱{pricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {order.paymentUrl && order.paymentStatus?.toLowerCase() !== "paid" && (
                <div className="flex flex-col items-center border border-black p-3 bg-white rounded-xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(order.paymentUrl)}`}
                    alt="Payment QR"
                    className="w-[120px] h-[120px]"
                  />
                  <span className="text-[8px] font-black uppercase text-black tracking-wider mt-1.5">
                    Scan to Pay
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
          </div>,
          document.body
        )}

        <style>{`
          @media print {
            /* Collapse everything so it takes no layout space */
            html, body {
              height: auto !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden;
            }
            /* Hide the main app content entirely so it produces no pages */
            body > *:not(#waybill-print-root) {
              display: none !important;
            }
            #printable-waybill, #printable-waybill * {
              visibility: visible;
            }
            #printable-waybill {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
          }
        `}</style>
        </div>
      </div>

      {onConfirmDelivery && (
        <ConfirmDeliveryDialog
          isOpen={showConfirmDelivery}
          onClose={() => setShowConfirmDelivery(false)}
          order={order}
          onSubmit={onConfirmDelivery}
        />
      )}

      {/* Status Change Confirmation Modal */}
      {statusToConfirm && (
        <>
          <div
            onClick={() => setStatusToConfirm(null)}
            style={{ position: "fixed", inset: 0, zIndex: 100001, backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100002,
              width: "calc(100% - 32px)",
              maxWidth: 400,
              backgroundColor: cardBg,
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: text }}>
                Confirm Status Update
              </h2>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ margin: 0, fontSize: 14, color: muted }}>
                Are you sure you want to change order status from <span style={{ fontWeight: "bold", color: text }}>{STATUS_LABELS[order.status]}</span> to <span style={{ fontWeight: "bold", color: text }}>{STATUS_LABELS[statusToConfirm]}</span>?
              </p>
            </div>
            <div
              style={{
                padding: "12px 24px",
                borderTop: `1px solid ${border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                backgroundColor: `${border}10`,
              }}
            >
              <button
                onClick={() => setStatusToConfirm(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleStatusChange(statusToConfirm);
                  setStatusToConfirm(null);
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: primary, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* Complete Payment Confirmation Modal */}
      {completePaymentToConfirm && (
        <>
          <div
            onClick={() => { if (!isCompletingPayment) setCompletePaymentToConfirm(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 100001, backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100002,
              width: "calc(100% - 32px)",
              maxWidth: 420,
              backgroundColor: cardBg,
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: text }}>
                Confirm Remaining Payment
              </h2>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ margin: 0, fontSize: 14, color: muted }}>
                Has the customer paid the remaining balance of{" "}
                <span style={{ fontWeight: "bold", color: text }}>₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>{" "}
                for Order {order.orderNumber ?? `#${order.id}`}, and has it reflected in the company GCash wallet balance?
              </p>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: muted }}>
                The order will be marked fully paid and moved to Paid (ready for shipment).
              </p>
            </div>
            <div
              style={{
                padding: "12px 24px",
                borderTop: `1px solid ${border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                backgroundColor: `${border}10`,
              }}
            >
              <button
                disabled={isCompletingPayment}
                onClick={() => setCompletePaymentToConfirm(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Not Yet
              </button>
              <button
                disabled={isCompletingPayment}
                onClick={async () => {
                  if (!onCompletePayment) return;
                  setIsCompletingPayment(true);
                  try {
                    await onCompletePayment();
                  } finally {
                    setIsCompletingPayment(false);
                    setCompletePaymentToConfirm(false);
                  }
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: primary, color: "white", fontSize: 14, fontWeight: 600, cursor: isCompletingPayment ? "wait" : "pointer", opacity: isCompletingPayment ? 0.7 : 1 }}
              >
                {isCompletingPayment ? "Confirming..." : "Yes, Payment Received"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelToConfirm && (
        <>
          <div
            onClick={() => setCancelToConfirm(false)}
            style={{ position: "fixed", inset: 0, zIndex: 100001, backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100002,
              width: "calc(100% - 32px)",
              maxWidth: 400,
              backgroundColor: cardBg,
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#dc2626" }}>
                Cancel Order
              </h2>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ margin: 0, fontSize: 14, color: muted }}>
                Are you sure you want to cancel Order #{order.id}? This action cannot be undone.
              </p>
            </div>
            <div
              style={{
                padding: "12px 24px",
                borderTop: `1px solid ${border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                backgroundColor: `${border}10`,
              }}
            >
              <button
                onClick={() => setCancelToConfirm(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  handleStatusChange("cancelled");
                  setCancelToConfirm(false);
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
