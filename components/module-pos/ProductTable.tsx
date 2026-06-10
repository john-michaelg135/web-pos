"use client";

import { useState } from "react";
import type { Product, ProductCategory } from "@/components/module-pos/types";
import { PRODUCT_CATEGORIES } from "@/components/module-pos/types";

interface ProductTableProps {
  products: Product[];
  onEdit:   (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const [search,   setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.id.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === "all" || p.category === catFilter;
    const matchStatus = statusFilter === "all" ||
                        (statusFilter === "active" && p.isActive) ||
                        (statusFilter === "inactive" && !p.isActive);
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="w-full min-w-0">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          maxLength={25}
          className="w-full sm:max-w-[200px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as ProductCategory | "all")}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">All Categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Status</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Product</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-bold px-4 py-1.5 rounded-full inline-flex items-center justify-center min-w-[80px] ${
                        p.isActive
                          ? "bg-success-50 dark:bg-success-500/20 text-success-600 dark:text-success-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(p)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(p)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
