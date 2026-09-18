import type { Product, Variation } from "./types";

// ── Mock Products ───────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "P-001",
    name: "Ube Halaya",
    category: "Ube Halaya",
    description: "Traditional Filipino purple yam dessert, smooth and creamy texture.",
    isActive: true,
    createdAt: "2026-01-15",
  },
  {
    id: "P-002",
    name: "Ube Halaya Tidbits",
    category: "Ube Halaya",
    description: "Chunky ube halaya with bits of yam for added texture.",
    isActive: true,
    createdAt: "2026-01-15",
  },
  {
    id: "P-003",
    name: "Ube Jam Smooth",
    category: "Ube Jam",
    description: "Spreadable ube jam with a velvety smooth consistency.",
    isActive: true,
    createdAt: "2026-02-01",
  },
  {
    id: "P-004",
    name: "Ube Jam Tidbits",
    category: "Ube Jam",
    description: "Ube jam with chunky yam pieces for a rustic spread.",
    isActive: true,
    createdAt: "2026-02-01",
  },
  {
    id: "P-005",
    name: "Ube Halaya Bulk",
    category: "Ube Halaya",
    description: "Industrial-grade ube halaya for institutional orders.",
    isActive: true,
    createdAt: "2026-03-10",
  },
  {
    id: "P-006",
    name: "Ube Jam Classic",
    category: "Ube Jam",
    description: "Original recipe ube jam, discontinued variant.",
    isActive: false,
    createdAt: "2025-11-01",
  },
];

// ── Mock Variations ─────────────────────────────────────────────────

export const MOCK_VARIATIONS: Variation[] = [
  { id: "V-001", productId: "P-001", packagingType: "Jar",       size: "500g",  price: 180,  sku: "UBH-SM-500", isActive: true  },
  { id: "V-002", productId: "P-001", packagingType: "Jar",       size: "300g",  price: 120,  sku: "UBH-SM-300", isActive: true  },
  { id: "V-003", productId: "P-002", packagingType: "Jar",       size: "500g",  price: 180,  sku: "UBH-TB-500", isActive: true  },
  { id: "V-004", productId: "P-003", packagingType: "Jar",       size: "300g",  price: 120,  sku: "UBJ-SM-300", isActive: true  },
  { id: "V-005", productId: "P-003", packagingType: "Jar",       size: "500g",  price: 160,  sku: "UBJ-SM-500", isActive: true  },
  { id: "V-006", productId: "P-004", packagingType: "Jar",       size: "300g",  price: 120,  sku: "UBJ-TB-300", isActive: true  },
  { id: "V-007", productId: "P-004", packagingType: "Jar",       size: "500g",  price: 160,  sku: "UBJ-TB-500", isActive: true  },
  { id: "V-008", productId: "P-005", packagingType: "Container", size: "5kg",   price: 1500, sku: "UBH-BK-5K",  isActive: true  },
  { id: "V-009", productId: "P-001", packagingType: "Pouch",     size: "250g",  price: 95,   sku: "UBH-SM-250", isActive: false },
  { id: "V-010", productId: "P-006", packagingType: "Jar",       size: "300g",  price: 100,  sku: "UBJ-CL-300", isActive: false },
];

// ── Mock Inventory ──────────────────────────────────────────────────

import type { StockLevel, StockMovement, AnalyticsData } from "./types";

export const MOCK_STOCK_LEVELS: StockLevel[] = [
  { variationId: "V-001", location: "Store",  quantity: 50,  lowStockThreshold: 20 },
  { variationId: "V-002", location: "Store",  quantity: 15,  lowStockThreshold: 20 }, // Low Stock
  { variationId: "V-003", location: "Store",  quantity: 100, lowStockThreshold: 30 },
  { variationId: "V-004", location: "Bazaar", quantity: 5,   lowStockThreshold: 10 }, // Low Stock
  { variationId: "V-005", location: "Bazaar", quantity: 45,  lowStockThreshold: 15 },
  { variationId: "V-008", location: "Store",  quantity: 2,   lowStockThreshold: 5  }, // Low Stock
];

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  { id: "M-001", variationId: "V-001", quantity: 100, type: "arrival", date: "2026-05-10 09:00", reference: "PO-2026-001", notes: "Regular restock" },
  { id: "M-002", variationId: "V-002", quantity: 50,  type: "arrival", date: "2026-05-12 14:30", reference: "PO-2026-002", notes: "Emergency stock" },
  { id: "M-003", variationId: "V-001", quantity: -5,  type: "sale",    date: "2026-05-14 11:20", reference: "ORD-12345" },
];

export const MOCK_ANALYTICS_DAILY: AnalyticsData[] = [
  { date: "2026-05-08", sales: 12500, orders: 45 },
  { date: "2026-05-09", sales: 15800, orders: 52 },
  { date: "2026-05-10", sales: 9400,  orders: 31 },
  { date: "2026-05-11", sales: 21000, orders: 68 },
  { date: "2026-05-12", sales: 18200, orders: 59 },
  { date: "2026-05-13", sales: 14500, orders: 48 },
  { date: "2026-05-14", sales: 25600, orders: 82 },
];

export const MOCK_ANALYTICS_WEEKLY: AnalyticsData[] = [
  { date: "Wk 17", sales: 92000, orders: 310 },
  { date: "Wk 18", sales: 105000, orders: 345 },
  { date: "Wk 19", sales: 98000, orders: 320 },
  { date: "Wk 20", sales: 112000, orders: 370 },
  { date: "Wk 21", sales: 124800, orders: 395 },
  { date: "Wk 22", sales: 118000, orders: 380 },
  { date: "Wk 23", sales: 135000, orders: 420 },
];

export const MOCK_ANALYTICS_MONTHLY: AnalyticsData[] = [
  { date: "Dec '25", sales: 450000, orders: 1510 },
  { date: "Jan '26", sales: 310000, orders: 1020 },
  { date: "Feb '26", sales: 340000, orders: 1130 },
  { date: "Mar '26", sales: 410000, orders: 1350 },
  { date: "Apr '26", sales: 480000, orders: 1580 },
  { date: "May '26", sales: 520000, orders: 1720 },
  { date: "Jun '26", sales: 580000, orders: 1890 },
];
