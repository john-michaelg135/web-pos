"use client";

import { useState } from "react";
import type { Variation, Product } from "@/components/module-pos/types";

interface VariationTableProps {
  variations: Variation[];
  products:   Product[];
  onEdit:     (variation: Variation) => void;
  onDelete:   (variation: Variation) => void;
}

export function VariationTable({ variations, products, onEdit, onDelete }: VariationTableProps) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const filtered = variations.filter((v) => {
    const matchProduct = productFilter === "all" || v.productId === productFilter;
    const prodName = productMap.get(v.productId) ?? "";
    const matchSearch  = v.sku.toLowerCase().includes(search.toLowerCase()) ||
                         v.id.toLowerCase().includes(search.toLowerCase()) ||
                         v.packagingType.toLowerCase().includes(search.toLowerCase()) ||
                         v.size.toLowerCase().includes(search.toLowerCase()) ||
                         prodName.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter === "all" ||
                         (statusFilter === "active" && v.isActive) ||
                         (statusFilter === "inactive" && !v.isActive);
    return matchProduct && matchSearch && matchStatus;
  });

  return (
    <div className="w-full min-w-0">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU or ID…"
          maxLength={25}
          className="w-full sm:max-w-[200px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
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
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Packaging</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Size</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Price</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">SKU</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No variations found.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {productMap.get(v.productId) ?? v.productId}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-full bg-blue-light-50 dark:bg-blue-light-500/20 text-blue-light-700 dark:text-blue-light-400">
                        {v.packagingType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {v.size}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      ₱{v.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <code className="inline-block whitespace-nowrap text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {v.sku}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-bold px-4 py-1.5 rounded-full inline-flex items-center justify-center min-w-[80px] ${
                        v.isActive
                          ? "bg-success-50 dark:bg-success-500/20 text-success-600 dark:text-success-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(v)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(v)}
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
