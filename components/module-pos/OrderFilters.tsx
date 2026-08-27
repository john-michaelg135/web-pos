"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { STATUS_LABELS } from "@/components/module-pos/types";
import { useAuth } from "@/context/AuthContext";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface OrderFiltersProps {
  show: boolean;
  onClose: () => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  resetFilters: () => void;
}

export default function OrderFilters({
  show,
  onClose,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  filterLocation,
  setFilterLocation,
  resetFilters,
}: OrderFiltersProps) {
  const { user: authUser } = useAuth();
  const hasLocationLock = !!authUser?.locationId;

  const [localType, setLocalType] = useState(filterType);
  const [localStatus, setLocalStatus] = useState(filterStatus);
  const [localLocation, setLocalLocation] = useState(filterLocation);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      setLocalType(filterType);
      setLocalStatus(filterStatus);
      setLocalLocation(filterLocation);
    }
  }, [show, filterType, filterStatus, filterLocation]);

  if (!show || !mounted) return null;

  const handleApply = () => {
    setFilterType(localType);
    setFilterStatus(localStatus);
    setFilterLocation(localLocation);
    onClose();
  };

  const handleReset = () => {
    resetFilters();
    onClose();
  };

  const modal = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}
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
          maxWidth: 480,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "visible",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", borderRadius: "12px 12px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#111827" }}>
                Filters
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
                Refine your order management view
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 4,
                color: "#6b7280",
              }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Location */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Location</Label>
            <CustomSelect
              value={localLocation}
              onChange={(val) => { if (!hasLocationLock) setLocalLocation(val); }}
              disabled={hasLocationLock}
              options={hasLocationLock ? [
                { value: localLocation, label: localLocation === "All" ? "All Locations" : localLocation }
              ] : [
                { value: "All", label: "All Locations" },
                { value: "Antipolo Store Branch", label: "Antipolo Store Branch" },
                { value: "Commissary 999", label: "Commissary 999" },
              ]}
            />
          </div>

          {/* Order Channel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Order Channel</Label>
            <CustomSelect
              value={localType}
              onChange={setLocalType}
              options={[
                { value: "All", label: "All Channels" },
                { value: "Walk-in", label: "Walk-in" },
                { value: "Store", label: "Store Pick-up" },
                { value: "Online", label: "Online Delivery" },
                { value: "Institutional", label: "Institutional" },
              ]}
            />
          </div>

          {/* Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Status</Label>
            <CustomSelect
              value={localStatus}
              onChange={setLocalStatus}
              options={[
                { value: "All", label: "All Statuses" },
                ...Object.entries(STATUS_LABELS).map(([val, label]) => ({ value: val, label }))
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "#f9fafb",
            borderRadius: "0 0 12px 12px",
          }}
        >
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
