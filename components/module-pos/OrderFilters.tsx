"use client";

import React, { useState, useEffect } from "react";
import { STATUS_LABELS } from "@/components/module-pos/types";
import { useAuth } from "@/context/AuthContext";
import { CustomSelect } from "@/components/module-pos/CustomSelect";
import { CloseLineIcon } from "@/icons/index";

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

  useEffect(() => {
    if (show) {
      setLocalType(filterType);
      setLocalStatus(filterStatus);
      setLocalLocation(filterLocation);
    }
  }, [show, filterType, filterStatus, filterLocation]);

  if (!show) return null;

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "#667085",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 12,
    border: "1px solid #e4e7ec",
    background: "#ffffff",
    color: "#101828",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

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

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Refine your order management view</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <CloseLineIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="col-span-1 md:col-span-2">
              <label style={labelStyle} className="dark:text-gray-400">Location</label>
              <CustomSelect
                style={{ ...inputStyle, opacity: hasLocationLock ? 0.6 : 1, cursor: hasLocationLock ? "not-allowed" : "pointer" }}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={localLocation}
                disabled={hasLocationLock}
                onChange={(val) => {
                  if (!hasLocationLock) setLocalLocation(val);
                }}
                options={hasLocationLock ? [
                  { value: localLocation, label: localLocation === "All" ? "All Locations" : (localLocation.startsWith("Store") ? localLocation : `Store - ${localLocation}`) }
                ] : [
                  { value: "All", label: "All Locations" },
                  { value: "Antipolo Store Branch", label: "Antipolo Store Branch" },
                  { value: "Commissary 999", label: "Commissary 999" },
                ]}
              />
            </div>

            <div>
              <label style={labelStyle} className="dark:text-gray-400">Order Channel</label>
              <CustomSelect
                style={inputStyle}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={localType}
                onChange={(val) => setLocalType(val)}
                options={[
                  { value: "All", label: "All Channels" },
                  { value: "Walk-in", label: "Walk-in" },
                  { value: "Store", label: "Store Pick-up" },
                  { value: "Online", label: "Online Delivery" },
                  { value: "Institutional", label: "Institutional" },
                ]}
              />
            </div>

            <div>
              <label style={labelStyle} className="dark:text-gray-400">Status</label>
              <CustomSelect
                style={inputStyle}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={localStatus}
                onChange={(val) => setLocalStatus(val)}
                options={[
                  { value: "All", label: "All Statuses" },
                  ...Object.entries(STATUS_LABELS).map(([val, label]) => ({ value: val, label: label as string }))
                ]}
              />
            </div>

          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={handleApply}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
