"use client";

import { CalenderIcon } from "@/icons/index";
import { Order, OrderStatus, STATUS_LABELS, STATUS_PIPELINE } from "./types";

interface OrderCardProps {
  order: Order;
  primary: string;
  muted: string;
  border: string;
  text: string;
  cardBg: string;
  inputBg: string;
  onReview?: () => void;
  onStatusUpdate?: (status: OrderStatus) => void;
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
  onReview,
  onStatusUpdate,
  isMobile,
}: OrderCardProps) {
  const isPending = order.status === "pending";
  const isRejected = order.status === "rejected";
  const isCompleted = order.status === "completed";

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: isMobile ? 20 : 32,
        padding: isMobile ? 16 : 40,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        opacity: isRejected ? 0.7 : 1,
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
            <h3 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700 }}>{order.id}</h3>
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
                      ? "#3b82f6"
                      : order.type === "institutional"
                      ? "#6366f1"
                      : "#10b981",
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
                    background: "#f5f3ff",
                    color: "#7c3aed",
                    border: "1px solid #ddd6fe",
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
              ? "#fffbeb"
              : isRejected
              ? "#fef2f2"
              : isCompleted
              ? "#ecfdf5"
              : `${primary}05`,
            border: `1px solid ${
              isPending
                ? "#fef3c7"
                : isRejected
                ? "#fee2e2"
                : isCompleted
                ? "#d1fae5"
                : `${primary}10`
            }`,
            color: isPending
              ? "#d97706"
              : isRejected
              ? "#dc2626"
              : isCompleted
              ? "#059669"
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

      {!isRejected && order.type !== "walk-in" && (
        <div style={{ position: "relative", padding: isMobile ? "24px 0" : "24px 0 32px", marginBottom: 32 }}>
            <div style={{ position: "relative", height: isMobile ? 60 : "auto", margin: isMobile ? "0 20px" : 0 }}>
              {/* Background Line */}
              <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 2, background: inputBg, borderRadius: 1 }} />
              
              {(() => {
                const currentIndex = STATUS_PIPELINE.indexOf(order.status);
                let visibleSteps = [];

                if (isMobile) {
                  // Show only 3 steps on mobile: Previous, Current, Next
                  if (currentIndex === 0) {
                    visibleSteps = [0, 1, 2];
                  } else if (currentIndex === STATUS_PIPELINE.length - 1) {
                    visibleSteps = [currentIndex - 2, currentIndex - 1, currentIndex];
                  } else {
                    visibleSteps = [currentIndex - 1, currentIndex, currentIndex + 1];
                  }
                } else {
                  // Show all steps on desktop
                  visibleSteps = STATUS_PIPELINE.map((_, i) => i);
                }

                const activeLineWidth = isMobile 
                  ? (currentIndex === visibleSteps[0] ? "0%" : currentIndex === visibleSteps[1] ? "50%" : "100%")
                  : `${(currentIndex / (STATUS_PIPELINE.length - 1)) * 100}%`;

                return (
                  <>
                    {/* Active Line */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 0,
                        height: 2,
                        background: primary,
                        width: activeLineWidth,
                        transition: "width 0.5s ease",
                        borderRadius: 1,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1, width: "100%", boxSizing: "border-box" }}>
                      {visibleSteps.map((stepIdx) => {
                        const step = STATUS_PIPELINE[stepIdx];
                        const active = currentIndex >= stepIdx;
                        const isCurrent = currentIndex === stepIdx;
                        
                        return (
                          <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: isMobile ? "auto" : 60, position: "relative" }}>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: isCurrent ? primary : (active ? primary : inputBg),
                                border: `2px solid ${active ? primary : border}`,
                                transition: "all 0.3s",
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
                  </>
                );
              })()}
            </div>
          </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          paddingTop: isMobile ? 20 : 24,
          borderTop: `1px solid ${border}`,
          gap: isMobile ? 20 : 0,
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
              Items
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {order.items.map((item: any, i: number) => (
                <p key={i} style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {item.name}{" "}
                  <span style={{ color: muted, opacity: 0.6 }}>× {item.quantity}</span>
                </p>
              ))}
            </div>
          </div>
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
            {order.remarks && (
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#f04438",
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                Remark: {order.remarks}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: muted,
                marginBottom: 4,
              }}
            >
              Grand Total
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
              ₱{order.total.toLocaleString()}
            </p>
          </div>
          {isPending && onReview && (
            <button
              onClick={onReview}
              style={{
                height: isMobile ? 48 : 56,
                padding: isMobile ? "0 24px" : "0 40px",
                borderRadius: isMobile ? 12 : 16,
                background: primary,
                color: "#fff",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: `0 10px 15px -3px ${primary}33`,
              }}
            >
              Review Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
