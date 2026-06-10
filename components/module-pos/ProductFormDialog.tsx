"use client";

import { useState, useEffect } from "react";
import type { Product, ProductCategory } from "@/components/module-pos/types";
import { PRODUCT_CATEGORIES } from "@/components/module-pos/types";
import { CloseLineIcon } from "@/icons/index";

interface ProductFormDialogProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSubmit: (product: Omit<Product, "id" | "createdAt">) => void;
  initial?: Product | null;
}

interface FormErrors {
  name?:        string;
  category?:    string;
  description?: string;
}

const NAME_MAX    = 30;
const DESC_MAX    = 500;
const PRICE_MAX   = 1000000;

export function ProductFormDialog({ isOpen, onClose, onSubmit, initial }: ProductFormDialogProps) {
  const [name,        setName]        = useState("");
  const [category,    setCategory]    = useState<ProductCategory | "">(""  );
  const [description, setDescription] = useState("");
  const [isActive,    setIsActive]    = useState(true);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [touched,     setTouched]     = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCategory(initial.category);
      setDescription(initial.description);
      setIsActive(initial.isActive);
    } else {
      setName("");
      setCategory("");
      setDescription("");
      setIsActive(true);
    }
    setErrors({});
    setTouched(new Set());
  }, [initial, isOpen]);

  function validate(allFields = false): boolean {
    const e: FormErrors = {};
    const check = (field: string) => allFields || touched.has(field);

    if (check("name")) {
      const trimmed = name.trim();
      if (!trimmed)                                          e.name = "Product name is required";
      else if (trimmed.length < 2)                           e.name = "Name must be at least 2 characters";
      else if (trimmed.length > NAME_MAX)                    e.name = `Name must not exceed ${NAME_MAX} characters`;
      else if (/[<>]/.test(trimmed))                         e.name = "Name cannot contain HTML characters (<, >)";
    }

    if (check("category")) {
      if (!category) e.category = "Category is required";
    }

    if (check("description")) {
      if (description.trim().length > DESC_MAX) e.description = `Description must not exceed ${DESC_MAX} characters`;
      else if (/[<>]/.test(description))        e.description = "Description cannot contain HTML characters (<, >)";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleBlur(field: string) {
    setTouched((prev) => new Set(prev).add(field));
    // Re-validate on blur so user sees feedback immediately
    setTimeout(() => validate(), 0);
  }

  function handleSubmit() {
    setTouched(new Set(["name", "category", "description"]));
    if (!validate(true)) return;
    onSubmit({
      name:        name.trim(),
      category:    category as ProductCategory,
      description: description.trim(),
      isActive,
    });
    onClose();
  }

  if (!isOpen) return null;

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Product Name <span className="text-error-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur("name")}
                maxLength={NAME_MAX}
                disabled={isEdit}
                placeholder="e.g. Ube Halaya Smooth"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.name ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                } ${isEdit ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900" : ""}`}
              />
              <div className="flex justify-between mt-1">
                {errors.name
                  ? <p className="text-xs text-error-500 font-medium">{errors.name}</p>
                  : <span />
                }
                <span className={`text-xs ${name.trim().length > NAME_MAX ? "text-error-500" : "text-gray-400"}`}>
                  {name.trim().length}/{NAME_MAX}
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Category <span className="text-error-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                onBlur={() => handleBlur("category")}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.category ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-error-500 font-medium">{errors.category}</p>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleBlur("description")}
                rows={3}
                maxLength={DESC_MAX}
                placeholder="Brief product description…"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none ${
                  errors.description ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.description
                  ? <p className="text-xs text-error-500 font-medium">{errors.description}</p>
                  : <span />
                }
                <span className={`text-xs ${description.trim().length > DESC_MAX ? "text-error-500" : "text-gray-400"}`}>
                  {description.trim().length}/{DESC_MAX}
                </span>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between mt-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isActive ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm"
          >
            {isEdit ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
