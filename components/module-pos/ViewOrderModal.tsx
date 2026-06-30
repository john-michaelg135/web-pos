"use client";

import { useMemo, useState, useEffect } from "react";
import { CloseLineIcon, CheckCircleIcon } from "@/icons/index";
import { Order, STATUS_LABELS, OrderStatus } from "@/components/module-pos/types";
import { renderVariationBadges } from "./utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
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
  onRequestRefund?: () => void;
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
  onRequestRefund,
  onApplyRefund,
  onRejectRefund,
}: ViewOrderModalProps) {
  const { user } = useAuth();
  const handleStatusChange = async (status: OrderStatus) => {
    if (onStatusUpdate) {
      await onStatusUpdate(status);
    }
  };

  const [tempStatus, setTempStatus] = useState<OrderStatus>(order.status);

  useEffect(() => {
    if (isOpen) {
      setTempStatus(order.status);
    }
  }, [order.status, order.id, isOpen]);

  const username = (user?.username || "").toLowerCase();
  const isDev = username === "posuser";
  const isCashier = user?.subRole === "Cashier";
  const isOrderManager = user?.subRole === "OrderManager";
  const isAdmin = user?.subRole === "Admin" || user?.role === "Admin" || user?.roles?.includes("Admin");
  const isAuthorizedToEdit = isDev || isOrderManager || isAdmin;

  const isWebOrder = order.type === "online" || order.source?.toLowerCase() === "e-commerce" || order.source?.toLowerCase() === "ecommerce";
  const isInstitutional = order.type === "institutional";
  const isPwdOrder = !!order.seniorPwdId;

  const allowedStatuses: OrderStatus[] = isWebOrder
    ? ["pending", "processing", "shipped", "delivered"]
    : isInstitutional
    ? ["pending", "processing", "shipped", "completed"]
    : ["pending", "processing", "paid", "completed"]; // walk-in / store

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-4xl mx-4 rounded-2xl shadow-xl border flex flex-col max-h-[90vh]"
        style={{ background: cardBg, borderColor: border }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b sticky top-0 z-10 rounded-t-2xl"
          style={{ borderColor: border, background: cardBg }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold" style={{ color: text }}>
              Manage Order {order.id}
            </h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                background: `${primary}15`,
                color: primary,
                border: `1px solid ${primary}30`
              }}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <CloseLineIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl border flex flex-col gap-1" style={{ borderColor: border, background: `${border}10` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: muted }}>Customer Details</p>
              <p className="text-sm font-bold" style={{ color: text }}>{order.customer}</p>
              {isPwdOrder ? (
                <>
                  {order.seniorPwdStreet && (
                    <p className="text-xs font-semibold" style={{ color: muted }}>
                      Address: <span style={{ color: text }}>
                        {`${order.seniorPwdStreet}, ${order.seniorPwdBarangay || ""}, ${order.seniorPwdCity || ""}, ${order.seniorPwdProvince || ""} ${order.seniorPwdZipCode || ""}`.replace(/,\s*,/g, ",").trim()}
                      </span>
                    </p>
                  )}
                  <p className="text-xs font-semibold" style={{ color: muted }}>
                    PWD ID: <span style={{ color: text }}>{order.seniorPwdId}</span>
                  </p>
                </>
              ) : (
                <>
                  {order.deliveryAddress && (
                    <p className="text-xs font-semibold" style={{ color: muted }}>
                      Address: <span style={{ color: text }}>{order.deliveryAddress}</span>
                    </p>
                  )}
                  {order.customVariationNotes && (
                    <p className="text-xs font-semibold" style={{ color: muted }}>
                      Notes: <span style={{ color: text }}>{order.customVariationNotes}</span>
                    </p>
                  )}
                </>
              )}

            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: border, background: `${border}10` }}>
              <p className="text-[10px] font-bold uppercase mb-1 tracking-wider" style={{ color: muted }}>Order Information</p>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-bold flex justify-between" style={{ color: text }}>
                  <span style={{ color: muted, fontWeight: 600 }}>Type:</span>
                  <span className="uppercase">{order.type} {order.isPreOrder ? "(Pre-order)" : ""}</span>
                </p>
                <p className="text-sm font-bold flex justify-between" style={{ color: text }}>
                  <span style={{ color: muted, fontWeight: 600 }}>Date:</span>
                  <span>{order.date}</span>
                </p>
                <p className="text-sm font-bold flex justify-between" style={{ color: text }}>
                  <span style={{ color: muted, fontWeight: 600 }}>Location:</span>
                  <span>{order.location}</span>
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

          {/* Direct Status Changer (Admin / Order Manager / dev) */}
          {isAuthorizedToEdit && order.status !== "refund_requested" && order.status !== "refunded" && order.status !== "rejected" && order.status !== "cancelled" && (
            <div className="p-4 rounded-xl border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: border, background: `${border}10` }}>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <p className="text-xs font-black uppercase tracking-wider m-0" style={{ color: text }}>Change Order Status</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">Directly transition this order to another valid delivery status.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
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
                    if (window.confirm(`Are you sure you want to change order status from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[tempStatus]}?`)) {
                      handleStatusChange(tempStatus);
                    }
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
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: border }}>
              <table className="w-full text-left">
                <thead style={{ background: `${border}20` }}>
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: muted }}>Item</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: muted }}>Qty</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: muted }}>Price</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: muted }}>Total</th>
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
                      <td className="px-4 py-3 text-sm font-bold text-center" style={{ color: text }}>
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: muted }}>
                        ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: text }}>
                        ₱{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {order.remarks && (
              <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
                <p className="text-[10px] font-bold uppercase text-red-500 mb-1 tracking-wider">Remarks / Reason</p>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">{order.remarks}</p>
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
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: text }}>Grand Total</span>
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
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl no-print" 
          style={{ borderColor: border }}
        >
          {/* Actions Left: Cancel / Refund / Review Refund */}
          <div className="flex items-center gap-2">
            {/* Cancel Order Button */}
            {["pending", "awaiting_stock", "processing", "shipped", "ready_for_delivery"].includes(order.status) && onStatusUpdate && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to cancel Order #${order.id}?`)) {
                    handleStatusChange("cancelled");
                  }
                }}
                className="px-4 py-2 text-xs font-bold uppercase text-red-600 border border-red-500/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
              >
                Cancel Order
              </button>
            )}

            {/* Request Refund Button: visible if order has been paid or is completed */}
            {(order.status === "completed" || order.paymentStatus === "paid") && !["refund_requested", "refunded", "cancelled", "rejected"].includes(order.status) && onRequestRefund && (
              <button
                onClick={onRequestRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Request Refund
              </button>
            )}

            {/* Approve Refund Button: visible to admin/manager when status is refund_requested */}
            {order.status === "refund_requested" && onApplyRefund && (isDev || isOrderManager || isAdmin) && (
              <button
                onClick={onApplyRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
              >
                Approve Refund
              </button>
            )}

            {/* Reject Refund Button: visible to admin/manager when status is refund_requested */}
            {order.status === "refund_requested" && onRejectRefund && (isDev || isOrderManager || isAdmin) && (
              <button
                onClick={onRejectRefund}
                className="px-4 py-2 text-xs font-bold uppercase text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Reject Refund
              </button>
            )}
          </div>

          {/* Actions Right: Waybill & Close */}
          <div className="flex items-center gap-2 ml-auto">
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
                  <span>Grand Total</span>
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

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-waybill, #printable-waybill * {
              visibility: visible;
            }
            #printable-waybill {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              display: block !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
