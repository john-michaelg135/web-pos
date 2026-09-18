"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { StockLevel } from "@/components/module-pos/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface StockAdjustmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockLevel | null;
  quantity: string;
  setQuantity: (qty: string) => void;
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

export default function StockAdjustmentFormDialog({
  isOpen,
  onClose,
  stock,
  quantity,
  setQuantity,
  reason,
  setReason,
  onSubmit,
}: StockAdjustmentFormDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !stock || !mounted) return null;

  const modal = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      />
      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
              Adjust Stock Level
            </h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: "#71717a" }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Variation ID</Label>
              <Input value={stock.variationId} disabled className="mt-1.5 bg-muted" />
            </div>

            <div>
              <Label className="text-muted-foreground">Location</Label>
              <Input value={stock.location} disabled className="mt-1.5 bg-muted" />
            </div>

            <div>
              <Label className="text-muted-foreground">Current Stock</Label>
              <Input value={stock.quantity} disabled className="mt-1.5 bg-muted font-bold" />
            </div>

            <div>
              <Label>Quantity to Adjust (e.g. -5, 10) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="-5"
                max={10000}
                min={-10000}
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Please specify the reason for this adjustment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                className="mt-1.5 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e4e4e7",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "#fafafa",
            borderRadius: "0 0 12px 12px",
            flexShrink: 0,
          }}
        >
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={!reason.trim() || !quantity || isNaN(Number(quantity))}
          >
            Submit for Approval
          </Button>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
