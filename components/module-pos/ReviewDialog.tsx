"use client";

import { CloseLineIcon, TimeIcon } from "@/icons/index";
import { Order } from "@/components/module-pos/types";

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  remarks: string;
  setRemarks: (remarks: string) => void;
  onApprove: () => void;
  onReject: () => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;
  isMobile?: boolean;
}

export default function ReviewDialog({
  isOpen,
  onClose,
  order,
  remarks,
  setRemarks,
  onApprove,
  onReject,
  primary,
  muted,
  border,
  text,
  cardBg,
  inputBg,
  isMobile,
}: ReviewDialogProps) {
  if (!isOpen || !order) return null;

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

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TimeIcon viewBox="0 0 20 20" className="w-5 h-5 text-brand-500" />
            {order.status === "refund_requested" ? "Review Refund Request" : "Review Order"}
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Items Summary ({order.items.length} Items)
              </label>
              <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                <div className="max-h-40 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <span>
                        {item.name} <span className="text-xs text-gray-400">({item.variation})</span> × {item.quantity}
                      </span>
                      <span>
                        ₱{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-100/50 dark:bg-gray-900/50 flex justify-between items-center text-sm font-bold text-gray-900 dark:text-white">
                  <span>Total Price</span>
                  <span className="text-lg text-brand-500">
                    ₱{order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {order.status === "refund_requested" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Refund Reason
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 select-none">
                  {order.remarks || "No reason specified."}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {order.status === "refund_requested" ? "Manager Remarks" : "Manager Remarks"}
              </label>
              <textarea
                placeholder={order.status === "refund_requested" ? "Enter refund approval or rejection remarks..." : "Enter approval or rejection reason..."}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReject}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
          >
            {order.status === "refund_requested" ? "Reject Refund" : "Reject Order"}
          </button>
          <button
            onClick={onApprove}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-success-500 hover:bg-success-600 transition-colors shadow-sm"
          >
            {order.status === "refund_requested" ? "Approve Refund" : "Approve & Process"}
          </button>
        </div>
      </div>
    </div>
  );
}
