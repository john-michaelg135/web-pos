"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseLineIcon } from "@/icons/index";
import { Order } from "@/components/module-pos/types";

interface RefundFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  reason: string;
  setReason: (reason: string) => void;
  onSubmit: () => void;
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
  const predefinedReasons = [
    "Item arrived damaged",
    "Wrong item received",
    "Item not as described",
    "Other"
  ];
  
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (predefinedReasons.includes(reason)) {
        setSelectedOption(reason);
      } else if (reason.trim() !== "") {
        setSelectedOption("Other");
      } else {
        setSelectedOption("");
      }
    }
  }, [isOpen, reason]);

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
            Request Refund
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
              <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-red-500 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 select-none">
                ₱{order.total.toLocaleString()}
              </div>
            </div>

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
                      className="w-4 h-4 text-slate-600 border-slate-300 focus:ring-slate-500 cursor-pointer"
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
            onClick={onSubmit}
            disabled={!reason.trim() || !selectedOption}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm ${
              reason.trim() && selectedOption
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
