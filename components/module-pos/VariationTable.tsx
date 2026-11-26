"use client";

import { useState } from "react";
import type { Variation, Product } from "@/components/module-pos/types";
import { SearchInput } from "@/components/module-pos/SearchInput";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

import { Skeleton } from "@/components/ui/skeleton";

interface VariationTableProps {
  isLoading?: boolean;
  variations: Variation[];
  products:   Product[];
  onEdit:     (variation: Variation) => void;
  /** Opens the variation's price history. */
  onHistory?: (variation: Variation) => void;
}

function VariationStatus({ isActive }: { isActive: boolean }) {
  const colors = isActive
    ? "bg-badge-purple text-badge-purple-foreground"
    : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-[18px] ${colors}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function VariationTableSkeleton() {
  return <VariationTable isLoading variations={[]} products={[]} onEdit={() => {}} onHistory={() => {}} />;
}

export function VariationTable({ variations, products, onEdit, onHistory, isLoading }: VariationTableProps) {
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
    <div className="w-full min-w-0" aria-busy={isLoading}>

      {/* Filters */}
      <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[240px_repeat(2,minmax(0,1fr))] sm:gap-3 mb-4 sm:mb-5">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product, size or SKU…"
          aria-label="Search pricing configuration"
          maxLength={25}
          className="col-span-2 h-[42px] sm:col-span-1"
        />
        <CustomSelect
          value={productFilter}
          onChange={(val) => setProductFilter(val)}
          style={{ minWidth: 0 }}
          className="[&>button]:h-[38px]"
          options={[
            { value: "all", label: "All Products" },
            ...products.map((p) => ({ value: p.id, label: p.name }))
          ]}
        />
        <CustomSelect
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as "all" | "active" | "inactive")}
          style={{ minWidth: 0 }}
          className="[&>button]:h-[38px]"
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      {/* Table */}
      {/* Phones: one card per variation */}
      <ul className="md:hidden flex flex-col gap-2.5 m-0 p-0 list-none">
        {isLoading ? Array.from({ length: 7 }, (_, i) => (
          <li key={i} aria-hidden className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-32" /><Skeleton className="h-[22px] w-14 rounded-full" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-4 w-9" /><Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
              <Skeleton className="h-7 w-14" />
              <div className="flex items-center gap-2">
                {onHistory && <Skeleton className="h-9 w-16 rounded-lg" />}
                <Skeleton className="h-9 w-14 rounded-lg" />
              </div>
            </div>
          </li>
        )) : filtered.length === 0 ? (
          <li className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">No variations found.</li>
        ) : (
          filtered.map((v) => (
            <li key={v.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-primary m-0 min-w-0">{productMap.get(v.productId) ?? v.productId}</p>
                <VariationStatus isActive={v.isActive} />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="whitespace-nowrap font-medium px-2.5 py-0.5 rounded-full bg-blue-light-50 dark:bg-blue-light-500/20 text-blue-light-700 dark:text-blue-light-400">
                  {v.packagingType}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{v.size}</span>
                <code className="whitespace-nowrap font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{v.sku}</code>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
                <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">₱{v.price.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  {onHistory && (
                    <button
                      onClick={() => onHistory(v)}
                      className="h-9 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      History
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(v)}
                    className="h-9 px-4 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Product</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Packaging</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Size</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Price</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">SKU</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 7 }, (_, i) => (
                <tr key={i} aria-hidden className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  {["h-5 w-32", "h-6 w-16 rounded-full", "h-5 w-10", "h-5 w-12", "h-5 w-20", "h-[22px] w-14 rounded-full"].map((shape) => (
                    <td key={shape} className="px-5 py-4"><Skeleton className={shape} /></td>
                  ))}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-[30px] w-12 rounded-lg" />
                      {onHistory && <Skeleton className="h-[30px] w-16 rounded-lg" />}
                    </div>
                  </td>
                </tr>
              )) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No variations found.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-primary">
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
                    <td className="px-5 py-4">
                      <VariationStatus isActive={v.isActive} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(v)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        {onHistory && (
                          <button
                            onClick={() => onHistory(v)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            History
                          </button>
                        )}
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
