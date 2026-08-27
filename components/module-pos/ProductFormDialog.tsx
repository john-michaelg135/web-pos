"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Product, ProductCategory } from "@/components/module-pos/types";
import { PRODUCT_CATEGORIES } from "@/components/module-pos/types";
import { CloseLineIcon } from "@/icons/index";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

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
  const [confirmAction, setConfirmAction] = useState<"add" | "cancel" | null>(null);

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
    
    if (isEdit) {
      onSubmit({
        name:        name.trim(),
        category:    category as ProductCategory,
        description: description.trim(),
        isActive,
      });
      onClose();
    } else {
      setConfirmAction("add");
    }
  }

  function handleCancel() {
    const isDirty = name !== (initial?.name ?? "") ||
                    category !== (initial?.category ?? "") ||
                    description !== (initial?.description ?? "");

    if (isDirty) {
      setConfirmAction("cancel");
    } else {
      onClose();
    }
  }

  if (!isOpen) return null;

  const isEdit = !!initial;

  const modalContent = (
    <>
      <div
        onClick={handleCancel}
        style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Product Name <span className="text-destructive">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur("name")}
                maxLength={NAME_MAX}
                disabled={isEdit}
                placeholder="e.g. Ube Halaya Smooth"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.name ? "border-destructive" : "border-gray-200 dark:border-gray-700"
                } ${isEdit ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900" : ""}`}
              />
              <div className="flex justify-between mt-1">
                {errors.name
                  ? <p className="text-xs text-destructive font-medium">{errors.name}</p>
                  : <span />
                }
                <span className={`text-xs ${name.trim().length > NAME_MAX ? "text-destructive" : "text-gray-400"}`}>
                  {name.trim().length}/{NAME_MAX}
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Category <span className="text-destructive">*</span>
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => {
                  setCategory(val as ProductCategory);
                  handleBlur("category");
                }}
                className={`w-full text-sm ${errors.category ? "border-destructive" : ""}`}
                options={[
                  { value: "", label: "Select category" },
                  ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))
                ]}
              />
              {errors.category && <p className="mt-1 text-xs text-destructive font-medium">{errors.category}</p>}
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
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
                  errors.description ? "border-destructive" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.description
                  ? <p className="text-xs text-destructive font-medium">{errors.description}</p>
                  : <span />
                }
                <span className={`text-xs ${description.trim().length > DESC_MAX ? "text-destructive" : "text-gray-400"}`}>
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
                  isActive ? "bg-foreground" : "bg-gray-300 dark:bg-gray-600"
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
        <div style={{ padding: "12px 24px", borderTop: "1px solid #e4e4e7", display: "flex", justifyContent: "flex-end", gap: 8, backgroundColor: "#fafafa", borderRadius: "0 0 12px 12px", flexShrink: 0 }}>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-foreground hover:bg-foreground/90 transition-colors shadow-sm"
          >
            {isEdit ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>

      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100000, backgroundColor: "rgba(0, 0, 0, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
              {confirmAction === "add" ? "Confirm Add Product" : "Discard Changes"}
            </h3>
            <p style={{ fontSize: 14, color: "#71717a", margin: 0 }}>
              {confirmAction === "add"
                ? "Are you sure you want to add this product?"
                : "Are you sure you want to cancel? Any unsaved changes will be lost."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === "add") {
                    onSubmit({
                      name: name.trim(),
                      category: category as ProductCategory,
                      description: description.trim(),
                      isActive,
                    });
                    onClose();
                  } else {
                    onClose();
                  }
                  setConfirmAction(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  confirmAction === "add"
                    ? "bg-foreground hover:bg-foreground/90"
                    : "bg-destructive hover:bg-destructive/90"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
