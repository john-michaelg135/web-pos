"use client";

import { Order } from "@/components/module-pos/types";

interface ApproveRefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: () => void;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;
  isMobile?: boolean;
}

export default function ApproveRefundDialog({
  isOpen,
  onClose,
  order,
  onSubmit,
  primary,
  muted,
  border,
  text,
  cardBg,
  inputBg,
  isMobile,
}: ApproveRefundDialogProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Approve Refund Request
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
              <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 select-none">
                ₱{order.total.toLocaleString()}
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>
                  Are you sure you want to approve this refund? Approving will permanently mark this order as <strong>Refunded</strong>, deduct the amount from sales, and automatically restore all items back into the inventory stock.
                </span>
              </div>
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
            onClick={onSubmit}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 cursor-pointer transition-colors shadow-sm"
          >
            Approve Refund
          </button>
        </div>
      </div>
    </div>
  );
}
