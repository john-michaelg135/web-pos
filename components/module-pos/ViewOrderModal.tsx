"use client";

import { CloseLineIcon } from "@/icons/index";
import { Order, STATUS_LABELS } from "@/components/module-pos/types";
import { renderVariationBadges } from "./utils";

interface ViewOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
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
}: ViewOrderModalProps) {
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
              Order {order.id}
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
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl border" style={{ borderColor: border, background: `${border}10` }}>
              <p className="text-[10px] font-bold uppercase mb-1 tracking-wider" style={{ color: muted }}>Customer Details</p>
              <p className="text-sm font-bold" style={{ color: text }}>{order.customer}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: muted }}>Status: <span style={{ color: text }}>{order.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}</span></p>
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
                <p className="text-[10px] font-bold uppercase text-red-500 mb-1 tracking-wider">Remarks</p>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">{order.remarks}</p>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="mt-8 flex justify-start">
            <div className="w-full sm:w-1/2 p-4 rounded-xl border" style={{ borderColor: border, background: `${border}10` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>Subtotal</span>
                <span className="text-sm font-bold" style={{ color: text }}>₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mb-3 pb-3 border-b" style={{ borderColor: border }}>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>Discount</span>
                <span className="text-sm font-bold" style={{ color: text }}>₱0.00</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: text }}>Grand Total</span>
                <span className="text-2xl font-bold" style={{ color: primary }}>
                  ₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl" 
          style={{ borderColor: border }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-sm"
            style={{ background: primary }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
