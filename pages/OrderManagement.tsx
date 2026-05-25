"use client";

import { useState, useMemo } from "react";
import { FilterIcon } from "@/icons/index";
import { Order, OrderStatus, STATUS_LABELS } from "@/components/types";
import OrderCard from "@/components/OrderCard";
import ReviewDialog from "@/components/ReviewDialog";
import OrderFilters from "@/components/OrderFilters";
import { useDarkMode } from "@/components/useDarkMode";
import { useMediaQuery } from "@/components/useMediaQuery";

const SearchIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const mockOrders: Order[] = [
  {
    id: "ORD-001",
    type: "online",
    customer: "Juan dela Cruz",
    items: [
      { name: "Ube Halaya Smooth 500g", variation: "Smooth 500g", quantity: 2, price: 180 },
      { name: "Ube Jam Smooth 300g", variation: "Smooth 300g", quantity: 1, price: 120 },
    ],
    total: 480,
    status: "pending",
    date: "2026-05-04",
    location: "Store",
    isPreOrder: false,
    paymentStatus: "pending",
  },
  {
    id: "ORD-002",
    type: "online",
    customer: "Maria Reyes",
    items: [{ name: "Ube Jam Tidbits 500g", variation: "Tidbits 500g", quantity: 3, price: 160 }],
    total: 480,
    status: "pending",
    date: "2026-05-05",
    location: "Bazaar",
    isPreOrder: true,
    paymentStatus: "paid",
  },
  {
    id: "ORD-003",
    type: "institutional",
    customer: "Grand Hyatt Hotel",
    items: [{ name: "Ube Halaya Bulk 5kg", variation: "Industrial", quantity: 5, price: 1500 }],
    total: 7500,
    status: "processing",
    date: "2026-05-05",
    location: "Store",
    isPreOrder: false,
    paymentStatus: "pending",
  },
  {
    id: "ORD-004",
    type: "walk-in",
    customer: "Guest Customer",
    items: [{ name: "Ube Halaya Smooth 500g", variation: "Smooth 500g", quantity: 1, price: 180 }],
    total: 180,
    status: "completed",
    date: "2026-05-03",
    location: "Store",
    isPreOrder: false,
    paymentStatus: "paid",
  },
];

export default function OrderManagement() {
  const user = { id: "U-001", name: "Ana Reyes", role: "manager", location: "Store", username: "manager" };
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");

  const resetFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterLocation("all");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           o.customer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || o.type === filterType;
      const matchesStatus = filterStatus === "all" || o.status === filterStatus;
      const matchesLocation = filterLocation === "all" || o.location === filterLocation;

      return matchesSearch && matchesType && matchesStatus && matchesLocation;
    });
  }, [orders, searchQuery, filterType, filterStatus, filterLocation]);

  const handleApprove = () => {
    if (!selectedOrder || !remarks.trim()) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: "processing" as const, remarks } : o))
    );
    setShowReviewDialog(false);
    setRemarks("");
  };

  const handleReject = () => {
    if (!selectedOrder || !remarks.trim()) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: "rejected" as const, remarks } : o))
    );
    setShowReviewDialog(false);
    setRemarks("");
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const pendingApproval = filteredOrders.filter((o) => o.status === "pending");
  const activeOrders = filteredOrders.filter((o) => !["pending", "completed", "rejected"].includes(o.status));
  const historyOrders = filteredOrders.filter((o) => ["completed", "rejected"].includes(o.status));

  // Design Tokens
  const dark = useDarkMode();
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

  return (
    <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif", color: text, overflowX: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: isMobile ? 32 : 32, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 20 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 28 : 30, fontWeight: 700, margin: "0 0 8px" }}>Order Management</h1>
          <p style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Track and manage all orders across channels</p>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: 12, width: isMobile ? "100%" : "auto" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <SearchIcon style={{ width: 16, height: 16, color: muted, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              placeholder="Search ID or Customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 40, width: "100%", height: 48 }}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ height: 48, width: isMobile ? "100%" : "auto", padding: "0 24px", borderRadius: 16, border: `1px solid ${border}`, background: showFilters ? primary : inputBg, color: showFilters ? "#fff" : text, fontSize: 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap" }}
          >
            <FilterIcon viewBox="0 0 24 24" style={{ width: 16, height: 16 }} /> Filters
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <OrderFilters 
        show={showFilters}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterLocation={filterLocation}
        setFilterLocation={setFilterLocation}
        resetFilters={resetFilters}
        border={border}
        muted={muted}
        cardBg={cardBg}
        inputBg={inputBg}
        text={text}
        isMobile={isMobile}
      />

      <div style={{ marginBottom: isMobile ? 32 : 32 }}>
        <div style={{ display: "flex", background: dark ? cardBg : "#f1f5f9", padding: 6, borderRadius: isMobile ? 20 : 24, gap: 4, width: isMobile ? "100%" : "fit-content" }}>
          <button 
            onClick={() => setActiveTab("pending")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "12px 0" : "12px 32px", borderRadius: isMobile ? 16 : 18, border: "none", fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "pending" ? (dark ? inputBg : "#fff") : "transparent", color: activeTab === "pending" ? primary : muted, boxShadow: activeTab === "pending" ? "0 4px 6px -1px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}
          >
            Pending ({pendingApproval.length})
          </button>
          <button 
            onClick={() => setActiveTab("active")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "12px 0" : "12px 32px", borderRadius: isMobile ? 16 : 18, border: "none", fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "active" ? (dark ? inputBg : "#fff") : "transparent", color: activeTab === "active" ? primary : muted, boxShadow: activeTab === "active" ? "0 4px 6px -1px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}
          >
            Active ({activeOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            style={{ flex: isMobile ? 1 : "initial", padding: isMobile ? "12px 0" : "12px 32px", borderRadius: isMobile ? 16 : 18, border: "none", fontSize: isMobile ? 9 : 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", background: activeTab === "history" ? (dark ? inputBg : "#fff") : "transparent", color: activeTab === "history" ? primary : muted, boxShadow: activeTab === "history" ? "0 4px 6px -1px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}
          >
            History ({historyOrders.length})
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {(activeTab === "pending" ? pendingApproval : activeTab === "active" ? activeOrders : historyOrders).map((order) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            primary={primary} 
            muted={muted} 
            border={border} 
            text={text} 
            cardBg={cardBg}
            inputBg={inputBg}
            onReview={() => { setSelectedOrder(order); setShowReviewDialog(true); }}
            onStatusUpdate={(s: OrderStatus) => updateOrderStatus(order.id, s)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Review Dialog */}
      <ReviewDialog 
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        order={selectedOrder}
        remarks={remarks}
        setRemarks={setRemarks}
        onApprove={handleApprove}
        onReject={handleReject}
        primary={primary}
        muted={muted}
        border={border}
        text={text}
        cardBg={cardBg}
        inputBg={inputBg}
        isMobile={isMobile}
      />
    </div>
  );
}
