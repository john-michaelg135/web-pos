"use client";

import { useState, useEffect, useRef } from "react";
import { PlusIcon, TrashBinIcon, CalenderIcon, PencilIcon } from "../../icons/index";
import { useTheme as useRealTheme } from "../../context/ThemeContext";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import axios from "axios";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
};

import { apiClient } from "../../components/module-pos/api";
import { PosButton as Button } from "@/components/module-pos/PosButton";
import { PosInput as Input } from "@/components/module-pos/PosInput";
import Label from "@/components/form/Label";

type Voucher = {
  id: string;
  code: string;
  type: "fixed" | "percentage";
  value: number;
  minSpend: number;
  expiryDate: string;
  status: "active" | "expired";
};

export default function ViewVoucherManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab & Filter state
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "fixed" | "percentage">("all");

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<"fixed" | "percentage">("fixed");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Edit & Delete states
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [voucherToEdit, setVoucherToEdit] = useState<Voucher | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editMinSpend, setEditMinSpend] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const openEditVoucher = (voucher: Voucher) => {
    setVoucherToEdit(voucher);
    setEditExpiryDate(voucher.expiryDate);
    setEditMinSpend(voucher.minSpend.toString());
    setEditIsActive(voucher.status === "active");
  };

  const handleDeleteVoucher = async () => {
    if (!voucherToDelete) return;
    try {
      await apiClient.api.voucherDelete(Number(voucherToDelete.id));
      toast.success("Voucher deleted successfully!");
      fetchVouchers();
    } catch (error) {
      console.error("Failed to delete voucher:", error);
      toast.error("Failed to delete voucher.");
    } finally {
      setVoucherToDelete(null);
    }
  };

  const handleUpdateVoucher = async () => {
    if (!voucherToEdit) return;
    if (!editExpiryDate || !editMinSpend) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (editMinSpend.length > 12 || Number(editMinSpend) > 999999999) {
      toast.error("Minimum spend is too large.");
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.api.voucherPartialUpdate(Number(voucherToEdit.id), {
        isActive: editIsActive,
        expiryDate: new Date(editExpiryDate).toISOString(),
        minimumSpend: Number(editMinSpend)
      });
      toast.success("Voucher updated successfully!");
      fetchVouchers();
      setVoucherToEdit(null);
    } catch (error: any) {
      console.error("Failed to update voucher:", error);
      toast.error(error.response?.data?.Message || "Failed to update voucher.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setIsLoading(true);
    const currentDate = new Date().toISOString().split('T')[0];
    try {
      const response = await apiClient.api.voucherList({ includeInactive: true });
      const data = response.data;
      const mappedVouchers: Voucher[] = data.map(v => {
        // Expiry date format check
        const expDate = v.expiryDate?.split('T')[0] || '';
        const isExpired = expDate < currentDate;
        return {
          id: v.voucherId?.toString() || "0",
          code: v.voucherCode || "",
          type: (v.discountType?.toLowerCase() === "percentage" || v.discountType?.toLowerCase() === "percent") ? "percentage" : "fixed",
          value: Number(v.discountValue) || 0,
          minSpend: Number(v.minimumSpend) || 0,
          expiryDate: expDate,
          status: isExpired || !v.isActive ? "expired" : "active"
        };
      });
      setVouchers(mappedVouchers);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      setErrorMsg("Failed to load vouchers.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value || !minSpend || !expiryDate) {
      setErrorMsg("Please fill in all fields.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    if (value.length > 12 || Number(value) > 999999999) {
      setErrorMsg("Discount value is too large.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    if (type === "percentage" && Number(value) > 100) {
      setErrorMsg("Percentage discount cannot exceed 100%.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    if (minSpend.length > 12 || Number(minSpend) > 999999999) {
      setErrorMsg("Minimum spend is too large.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    if (expiryDate < currentDate) {
      setErrorMsg("Expiry date cannot be in the past.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmCreateVoucher = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.api.voucherCreate({
        voucherCode: code.toUpperCase(),
        discountType: type,
        discountValue: Number(value),
        minimumSpend: Number(minSpend),
        expiryDate: new Date(expiryDate).toISOString()
      });
      
      toast.success("Voucher created successfully!");
      setCode("");
      setValue("");
      setMinSpend("");
      setExpiryDate("");
      
      // Refresh list
      fetchVouchers();
      
      // Automatically switch to Vouchers List tab and show all
      setActiveTab("list");
      setStatusFilter("all");
    } catch (error: any) {
      console.error("Failed to create voucher:", error);
      const serverMsg = error.response?.data?.Message || "Failed to create voucher";
      setErrorMsg(serverMsg);
      toast.error(serverMsg);
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const { theme } = useTheme();
  const dark = theme === "dark";
  const isMobile = useMediaQuery("(max-width: 768px)");
  const primary = "#465fff";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const text = dark ? "#f0f4f8" : "#101828";
  const muted = dark ? "#8899aa" : "#667085";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const cardBg = dark ? "#212d40" : "#ffffff";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    borderRadius: 12, border: `1px solid ${border}`,
    background: inputBg, color: text,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em"
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    paddingRight: "36px",
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='${encodeURIComponent(muted)}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: "right 12px center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "18px",
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesQuery = !searchQuery.trim() || v.code.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesType = typeFilter === "all" || v.type === typeFilter;
    return matchesStatus && matchesQuery && matchesType;
  });

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!authUser || (authUser.username !== "posuser" && !authUser.apps.includes("voucher-management"))) {
    return <AccessDenied />;
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto animate-in fade-in duration-500" style={{ color: text }}>
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Voucher Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and monitor discount vouchers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex gap-4">
          <button 
            onClick={() => { setActiveTab("list"); setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); }}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === "list" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            Vouchers List
          </button>
          <button 
            onClick={() => setActiveTab("create")}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === "create" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            Create Voucher
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "list" && (
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Filter Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by voucher code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={25}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-outfit"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-outfit"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Discount Type Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Discount Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-outfit"
                  >
                    <option value="all">All Types</option>
                    <option value="fixed">Fixed Amount (₱)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vouchers List */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: 20, borderBottom: `1px solid ${border}` }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Vouchers List</h2>
              </div>
              
              {isLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: muted, fontSize: 13, fontWeight: 700 }}>Loading vouchers...</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: dark ? `${inputBg}44` : "#f8fafc", borderBottom: `1px solid ${border}` }}>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Code</th>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Discount</th>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Min Spend</th>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Expiry</th>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Status</th>
                        <th style={{ padding: "12px 20px", textAlign: "center", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVouchers.map(v => (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{v.code}</td>
                          <td style={{ padding: "16px 20px", fontSize: 13, color: muted, fontWeight: 500, whiteSpace: "nowrap" }}>
                            {v.type === "fixed" ? `₱${v.value}` : `${v.value}%`}
                          </td>
                          <td style={{ padding: "16px 20px", fontSize: 13, color: muted, whiteSpace: "nowrap" }}>₱{v.minSpend}</td>
                          <td style={{ padding: "16px 20px", fontSize: 13, color: muted, whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <CalenderIcon viewBox="0 0 24 24" style={{ width: 14, height: 14, color: muted }} />
                              {v.expiryDate}
                            </div>
                          </td>
                          <td style={{ padding: "16px 20px" }}>
                            <span style={{ 
                              padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", 
                              background: v.status === "active" ? (dark ? "#064e3b" : "#dcfce7") : (dark ? "#451a03" : "#fef3c7"),
                              color: v.status === "active" ? "#22c55e" : "#d97706",
                              border: `1px solid ${v.status === "active" ? (dark ? "#065f46" : "#bbf7d0") : (dark ? "#78350f" : "#fde68a")}`
                            }}>
                              {v.status}
                            </span>
                          </td>
                          <td style={{ padding: "16px 20px", textAlign: "center" }}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditVoucher(v)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setVoucherToDelete(v)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredVouchers.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: 40, textAlign: "center", color: muted, fontSize: 13 }}>No vouchers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "create" && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden", width: "100%" }} className="shadow-sm">
            <div style={{ padding: 20, borderBottom: `1px solid ${border}`, background: dark ? `${inputBg}55` : "#f8fafc55" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                Create New Voucher
              </h2>
              <p style={{ fontSize: 12, color: muted, marginTop: 4, fontWeight: 500 }}>Configure the code, discount values, minimum spend requirements, and validity dates.</p>
            </div>
            <form onSubmit={handleCreateVoucher} className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Row 1 Headers */}
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: primary, margin: 0 }}>General Information</h3>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: primary, margin: 0 }} className="hidden md:block">Discount & Rules</h3>

                {/* Row 2: Voucher Code & Discount Type */}
                <div>
                  <Label>Voucher Code</Label>
                  <Input 
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER2026"
                    className="uppercase"
                    required
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: primary, margin: "12px 0 0" }} className="block md:hidden">Discount & Rules</h3>
                  <Label>Discount Type</Label>
                  <select value={type} onChange={e => setType(e.target.value as any)} style={selectStyle}>
                    <option value="fixed">Fixed Amount (₱)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                {/* Row 3: Expiry Date & Value / Min Spend */}
                <div>
                  <Label>Expiry Date</Label>
                  <div className="relative flex items-center">
                    <Input 
                      ref={dateInputRef as any}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={expiryDate} 
                      onChange={e => setExpiryDate(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (dateInputRef.current) {
                          try {
                            dateInputRef.current.showPicker();
                          } catch (err) {
                            dateInputRef.current.focus();
                          }
                        }
                      }}
                      className="absolute right-3 bg-transparent border-none cursor-pointer p-0 flex items-center justify-center text-gray-500"
                    >
                      <CalenderIcon viewBox="0 0 24 24" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Value {type === "fixed" ? "(₱)" : "(%)"}</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={value} onChange={e => setValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder={type === "fixed" ? "100" : "10"}
                      required
                    />
                  </div>
                  <div>
                    <Label>Min. Spend (₱)</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={minSpend} onChange={e => setMinSpend(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="500"
                      required
                    />
                  </div>
                </div>
              </div>

              {errorMsg && <div className="text-red-500 text-xs font-bold">{errorMsg}</div>}
              
              <Button 
                type="submit" 
                variant="primary"
                disabled={isSubmitting}
                className="mt-2 w-full flex items-center justify-center gap-2 h-12 text-sm uppercase tracking-wider font-bold"
              >
                {isSubmitting ? "Creating..." : <><PlusIcon viewBox="0 0 12 12" className="w-4 h-4" /> Create Voucher</>}
              </Button>
            </form>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmCreateVoucher}
        title="Confirm Voucher Creation"
        message={`Are you sure you want to create voucher "${code.toUpperCase()}" with a ${type === "fixed" ? `₱${value}` : `${value}%`} discount?`}
        confirmVariant="brand"
      />

      <DeleteConfirmDialog
        isOpen={voucherToDelete !== null}
        onClose={() => setVoucherToDelete(null)}
        onConfirm={handleDeleteVoucher}
        title="Confirm Voucher Deletion"
        message={voucherToDelete ? `Are you sure you want to delete voucher "${voucherToDelete.code}"?` : ""}
        confirmVariant="danger"
      />

      {voucherToEdit && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Edit Voucher: {voucherToEdit.code}
              </h2>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Voucher Code</label>
                  <input style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} value={voucherToEdit.code} disabled />
                </div>
                <div>
                  <label style={labelStyle}>Discount Type</label>
                  <input style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} value={voucherToEdit.type === "percentage" ? "Percentage (%)" : "Fixed Amount (₱)"} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Discount Value</label>
                  <input style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} value={voucherToEdit.type === "percentage" ? `${voucherToEdit.value}%` : `₱${voucherToEdit.value}`} disabled />
                </div>
                <div>
                  <label style={labelStyle}>Min. Spend (₱)</label>
                  <input 
                    type="number" 
                    style={inputStyle} 
                    value={editMinSpend} 
                    onChange={e => setEditMinSpend(e.target.value)} 
                    min="0"
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input 
                    type="date" 
                    style={inputStyle} 
                    value={editExpiryDate} 
                    onChange={e => setEditExpiryDate(e.target.value)} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={selectStyle} value={editIsActive ? "active" : "inactive"} onChange={e => setEditIsActive(e.target.value === "active")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <button
                onClick={() => setVoucherToEdit(null)}
                className="px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVoucher}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-colors text-sm disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
