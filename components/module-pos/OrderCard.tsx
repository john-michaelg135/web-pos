"use client";

import { useState } from "react";
import { ViewOrderModal } from "./ViewOrderModal";

import { CalenderIcon } from "@/icons/index";
import { Order, OrderStatus, STATUS_LABELS, STATUS_PIPELINE } from "@/components/module-pos/types";
import { useAuth } from "@/context/AuthContext";

interface OrderCardProps {
  order: Order;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;

  onStatusUpdate?: (status: OrderStatus) => Promise<boolean | void>;
  onRequestRefund?: () => void;
  onApplyRefund?: () => void;
  onRejectRefund?: () => void;
  isMobile?: boolean;
}

export default function OrderCard({
  order,
  primary,
  muted,
  border,
  text,
  cardBg,
  inputBg,
  onStatusUpdate,
  onRequestRefund,
  onApplyRefund,
  onRejectRefund,
  isMobile,
}: OrderCardProps) {
  const { user } = useAuth();
  const username = (user?.username || "").toLowerCase();
  const isDev = username === "posuser";
  const isCashier = user?.subRole === "Cashier";
  const isOrderManager = user?.subRole === "OrderManager";
  const isAdmin = user?.subRole === "Admin" || user?.role === "Admin" || user?.roles?.includes("Admin");

  const isWebOrder = order.type === "online" || order.source?.toLowerCase() === "e-commerce" || order.source?.toLowerCase() === "ecommerce";
  const isPending = order.status === "pending";
  const isRejected = order.status === "rejected";
  const isCompleted = order.status === "completed" || (isWebOrder && order.status === "delivered");
  const [showViewModal, setShowViewModal] = useState(false);

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: isMobile ? 16 : 40,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        opacity: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 24 : 0,
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700 }}>{order.orderNumber || order.id}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background:
                    order.type === "online"
                      ? "#18181b"
                      : order.type === "institutional"
                      ? "#3f3f46"
                      : "#27272a",
                  color: "#fff",
                }}
              >
                {order.type}
              </span>
              {order.isPreOrder && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#f4f4f5",
                    color: "#3f3f46",
                    border: "1px solid #e4e4e7",
                  }}
                >
                  Pre-order
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
            }}
          >
            <span>{order.customer}</span>
            <span
              style={{ width: 4, height: 4, background: muted, borderRadius: "50%", opacity: 0.3 }}
            ></span>
            <span style={{ color: muted, fontSize: isMobile ? 11 : 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {order.location}
            </span>
          </div>
        </div>
        <div
          style={{
            padding: "8px 20px",
            borderRadius: 16,
            background: isPending
              ? "#fafafa"
              : isRejected
              ? "#fef2f2"
              : isCompleted
              ? "#f4f4f5"
              : `${primary}08`,
            border: `1px solid ${
              isPending
                ? "#e4e4e7"
                : isRejected
                ? "#fee2e2"
                : isCompleted
                ? "#e4e4e7"
                : `${primary}15`
            }`,
            color: isPending
              ? "#71717a"
              : isRejected
              ? "#dc2626"
              : isCompleted
              ? "#18181b"
              : primary,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: "currentColor",
              borderRadius: "50%",
            }}
          />
          {STATUS_LABELS[order.status]}
        </div>
      </div>

      {!["rejected", "cancelled", "refunded", "refund_requested"].includes(order.status) && (
        <div style={{ position: "relative", padding: isMobile ? "24px 0" : "24px 0 32px", marginBottom: 32 }}>
          {(() => {
            const currentPipeline: OrderStatus[] = isWebOrder
              ? ["pending", "processing", "shipped", "delivered"]
              : order.type === "institutional"
              ? ["pending", "processing", "shipped", "completed"]
              : ["pending", "processing", "paid", "completed"]; // walk-in / store

            let currentIndex = currentPipeline.indexOf(order.status);
            if (currentIndex === -1) currentIndex = 0;

            let visibleSteps = [];

            if (isMobile) {
              // Show only 3 steps on mobile: Previous, Current, Next
              if (currentIndex === 0) {
                visibleSteps = [0, 1, 2];
              } else if (currentIndex === currentPipeline.length - 1) {
                visibleSteps = [currentIndex - 2, currentIndex - 1, currentIndex];
              } else {
                visibleSteps = [currentIndex - 1, currentIndex, currentIndex + 1];
              }
            } else {
              // Show all steps on desktop
              visibleSteps = currentPipeline.map((_, i) => i);
            }

            const stepWidth = isMobile ? 80 : (currentPipeline.length <= 4 ? 90 : 60);
            const dotOffset = stepWidth / 2;

            const activeLineWidth = isMobile 
              ? (currentIndex === visibleSteps[0] ? "0%" : currentIndex === visibleSteps[1] ? "50%" : "100%")
              : `${(currentIndex / (currentPipeline.length - 1)) * 100}%`;

            return (
              <div style={{ position: "relative", height: isMobile ? 60 : "auto", margin: isMobile ? "0 20px" : 0 }}>
                {/* Line Container (Centered exactly with the dots) */}
                <div style={{ position: "absolute", top: 6, left: dotOffset, right: dotOffset, height: 2 }}>
                  {/* Background Line */}
                  <div style={{ width: "100%", height: "100%", background: border, borderRadius: 1 }} />
                  {/* Active Line */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      background: primary,
                      width: activeLineWidth,
                      transition: "width 0.5s ease",
                      borderRadius: 1,
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1, width: "100%", boxSizing: "border-box" }}>
                  {visibleSteps.map((stepIdx) => {
                    if (stepIdx < 0 || stepIdx >= currentPipeline.length) return null;
                    const step = currentPipeline[stepIdx];
                    const active = currentIndex >= stepIdx;
                    const isCurrent = currentIndex === stepIdx;
                    
                    return (
                      <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: stepWidth, position: "relative" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: isCurrent ? primary : (active ? primary : inputBg),
                            border: `2px solid ${active ? primary : border}`,
                            boxShadow: isCurrent ? `0 0 0 4px ${primary}33` : "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: isCurrent ? text : (active ? muted : `${muted}66`),
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            maxWidth: isMobile ? 80 : "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          paddingTop: isMobile ? 20 : 24,
          borderTop: `1px solid ${border}`,
          gap: isMobile ? 20 : 0,
          marginTop: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 24 : 40,
            flex: 1,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: muted,
                marginBottom: 16,
              }}
            >
              Date
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: muted }}>
              <CalenderIcon viewBox="0 0 24 24" style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{order.date}</span>
            </div>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right" }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: muted,
                marginBottom: 16,
              }}
            >
              Grand Total
            </p>
            <p style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0 }}>
              ₱{order.total.toLocaleString()}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: isMobile ? 0 : 26, marginLeft: isMobile ? 0 : 32 }}>
          <button
            onClick={() => setShowViewModal(true)}
            style={{
              height: isMobile ? 48 : 56,
              padding: isMobile ? "0 24px" : "0 40px",
              borderRadius: isMobile ? 12 : 16,
              background: "transparent",
              color: primary,
              border: `1px solid ${primary}40`,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = `${primary}10`)}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {isCashier && ["refund_requested", "refunded"].includes(order.status) ? "Review Order" : "Manage Order"}
          </button>
          



        </div>
      </div>
      
      <ViewOrderModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        order={order}
        primary={primary}
        muted={muted}
        border={border}
        text={text}
        cardBg={cardBg}
        onStatusUpdate={onStatusUpdate}
        onRequestRefund={onRequestRefund}
        onApplyRefund={onApplyRefund}
        onRejectRefund={onRejectRefund}
      />
    </div>
  );
}
