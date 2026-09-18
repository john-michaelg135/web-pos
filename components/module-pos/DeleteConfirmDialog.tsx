"use client";

import { CloseLineIcon } from "@/icons/index";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmVariant?: "danger" | "brand";
}

export function DeleteConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmVariant = "danger"
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmBtnBg = confirmVariant === "brand"
    ? "bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30"
    : "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-xl font-bold text-white transition-colors ${confirmBtnBg}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

