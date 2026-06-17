"use client";

import { CloseLineIcon } from "@/icons/index";
import { Order, STATUS_LABELS } from "@/components/module-pos/types";
import { renderVariationBadges } from "./utils";
import { toast } from "sonner";

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

  const isWebOrder = order.type === "online" || order.source?.toLowerCase() === "e-commerce" || order.source?.toLowerCase() === "ecommerce";

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

          {/* Xendit Payment Details for Online Orders */}
          {isWebOrder && order.paymentUrl && (
            <div 
              className="p-5 rounded-xl border mb-8 flex flex-col sm:flex-row items-center justify-between gap-6" 
              style={{ borderColor: border, background: `linear-gradient(135deg, ${primary}0A, ${primary}15)` }}
            >
              <div className="flex-1 w-full">
                <h4 className="text-xs font-bold uppercase mb-2 tracking-wider animate-pulse" style={{ color: primary }}>
                  Xendit Cashless GCash COD Payment Link
                </h4>
                <p className="text-xs mb-4" style={{ color: muted }}>
                  Scan the QR code to pay via GCash, or copy the checkout URL to send to the customer.
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
                  alt="GCash Payment QR Code" 
                  className="w-[140px] h-[140px]"
                />
                <span className="text-[9px] font-bold uppercase mt-2 text-gray-500 tracking-wider">
                  GCash Scan to Pay
                </span>
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
          className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl no-print" 
          style={{ borderColor: border }}
        >
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
              <p className="text-sm font-black uppercase text-black">{isWebOrder ? 'Cashless COD / GCash' : 'COD'}</p>
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
              <div className="w-full border-t border-black pt-3 flex justify-between items-center text-sm font-black mb-6">
                <span>Grand Total</span>
                <span className="text-xl">₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {isWebOrder && order.paymentUrl && (
                <div className="flex flex-col items-center border border-black p-3 bg-white rounded-xl shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(order.paymentUrl)}`} 
                    alt="Payment QR" 
                    className="w-[120px] h-[120px]"
                  />
                  <span className="text-[8px] font-black uppercase text-black tracking-wider mt-1.5">
                    GCash Scan to Pay
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
