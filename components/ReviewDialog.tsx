"use client";

import { CloseLineIcon, TimeIcon } from "@/icons/index";
import { Order } from "./types";

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
      }}
    >
      <div
        style={{
          background: cardBg,
          width: isMobile ? "calc(100% - 32px)" : "100%",
          maxWidth: 460,
          borderRadius: isMobile ? 24 : 32,
          padding: isMobile ? 24 : 32,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? 16 : 24,
            right: isMobile ? 16 : 24,
            width: 36,
            height: 36,
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: cardBg,
            color: muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <CloseLineIcon viewBox="0 0 17 16" style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: `${primary}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              color: primary,
            }}
          >
            <TimeIcon viewBox="0 0 20 20" style={{ width: 24, height: 24 }} />
          </div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: "0 0 4px" }}>
            Review Order
          </h2>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: muted,
              textTransform: "uppercase",
            }}
          >
            Order {order.id} · {order.customer}
          </p>
        </div>

        <div
          style={{
            background: inputBg,
            border: `1px solid ${border}`,
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: muted,
                textTransform: "uppercase",
              }}
            >
              Items Summary
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: primary,
                background: `${primary}15`,
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              {order.items.length} Items
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 16,
              maxHeight: 100,
              overflowY: "auto",
            }}
          >
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span style={{ color: muted }}>
                  ₱{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: border, marginBottom: 16 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              Grand Total
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: primary }}>
              ₱{order.total.toLocaleString()}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>Manager Remarks</label>
          <textarea
            placeholder="Enter approval or rejection reason..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{ ...inputStyle, minHeight: 100, resize: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={onReject}
            disabled={!remarks.trim()}
            style={{
              height: 48,
              borderRadius: 16,
              border: "none",
              background: "transparent",
              color: "#f04438",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
              opacity: remarks.trim() ? 1 : 0.3,
            }}
          >
            Reject Order
          </button>
          <button
            onClick={onApprove}
            disabled={!remarks.trim()}
            style={{
              height: 48,
              borderRadius: 16,
              border: "none",
              background: primary,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
              opacity: remarks.trim() ? 1 : 0.3,
            }}
          >
            Approve & Process
          </button>
        </div>
      </div>
    </div>
  );
}
