"use client";

import React from "react";
import { STATUS_LABELS } from "@/components/module-pos/types";

interface OrderFiltersProps {
  show: boolean;
  filterType: string;
  setFilterType: (type: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  filterPreOrder: string;
  setFilterPreOrder: (preOrder: string) => void;
  resetFilters: () => void;
  border: string;
  muted: string;
  cardBg: string;
  inputBg: string;
  text: string;
  isMobile?: boolean;
}

export default function OrderFilters({
  show,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  filterLocation,
  setFilterLocation,
  filterDate,
  setFilterDate,
  filterPreOrder,
  setFilterPreOrder,
  resetFilters,
  border,
  muted,
  cardBg,
  inputBg,
  text,
  isMobile,
}: OrderFiltersProps) {
  if (!show) return null;

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
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: isMobile ? 24 : 32,
        padding: isMobile ? "20px 16px" : 32,
        marginBottom: isMobile ? 20 : 32,
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 12 : 24,
          marginBottom: isMobile ? 12 : 24,
        }}
      >
        <div>
          <label style={labelStyle}>Order Type</label>
          <select
            style={inputStyle}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="walk-in">Walk-in</option>
            <option value="online">Online</option>
            <option value="institutional">Institutional</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={inputStyle}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <select
            style={inputStyle}
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="all">All Locations</option>
            <option value="Store">Store</option>
            <option value="Bazaar">Bazaar</option>
            <option value="Online">Online</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 12 : 24,
        }}
      >
        <div>
          <label style={labelStyle}>Date</label>
          <input 
            type="date"
            style={inputStyle}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Order Category</label>
          <select
            style={inputStyle}
            value={filterPreOrder}
            onChange={(e) => setFilterPreOrder(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="regular">Regular Orders</option>
            <option value="pre-order">Pre-orders Only</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={resetFilters}
            style={{
              height: 48,
              width: "100%",
              borderRadius: 12,
              border: "none",
              background: "#fef2f2",
              color: "#ef4444",
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
