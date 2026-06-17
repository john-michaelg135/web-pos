"use client";

import { useState, useEffect } from "react";
import type { Variation, Product } from "@/components/module-pos/types";
import { CloseLineIcon } from "@/icons/index";

interface VariationFormDialogProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSubmit: (variation: Omit<Variation, "id">) => void;
  initial?: Variation | null;
  products: Product[];
  existingSkus: string[];
}

interface FormErrors {
  productId?:     string;
  packagingType?: string;
  size?:          string;
  price?:         string;
  sku?:           string;
}

const PKG_MAX   = 40;
const SIZE_MAX  = 20;
const SKU_MAX   = 50;
const PRICE_MAX = 1000000;

export function VariationFormDialog({
  isOpen, onClose, onSubmit, initial, products, existingSkus,
}: VariationFormDialogProps) {
  const [productId,     setProductId]     = useState("");
  const [packagingType, setPackagingType] = useState("");
  const [sizeValue,     setSizeValue]     = useState("");
  const [sizeUnit,      setSizeUnit]      = useState("g");
  const [price,         setPrice]         = useState("");
  const [sku,           setSku]           = useState("");
  const [isActive,      setIsActive]      = useState(true);
  const [errors,        setErrors]        = useState<FormErrors>({});
  const [touched,       setTouched]       = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initial) {
      setProductId(initial.productId);
      setPackagingType(initial.packagingType);
      const numPart = initial.size.replace(/[^\d.]/g, '');
      const unitPart = initial.size.replace(/[\d.]/g, '').trim() || 'g';
      setSizeValue(numPart);
      setSizeUnit(unitPart);
      setPrice(String(initial.price));
      setSku(initial.sku);
      setIsActive(initial.isActive);
    } else {
      setProductId("");
      setPackagingType("");
      setSizeValue("");
      setSizeUnit("g");
      setPrice("");
      setSku("");
      setIsActive(true);
    }
    setErrors({});
    setTouched(new Set());
  }, [initial, isOpen]);

  function validate(allFields = false, checkProductId = productId): boolean {
    const e: FormErrors = {};
    const check = (field: string) => allFields || touched.has(field);

    // Product: required
    if (check("productId") && !isEdit) {
      if (!checkProductId.trim()) e.productId = "Product is required";
    }

    // Packaging Type: required, min 2, max, letters/numbers/spaces only
    if (check("packagingType")) {
      const trimmed = packagingType.trim();
      if (!trimmed)                                       e.packagingType = "Packaging type is required";
      else if (trimmed.length < 2)                        e.packagingType = "Must be at least 2 characters";
      else if (trimmed.length > PKG_MAX)                  e.packagingType = `Must not exceed ${PKG_MAX} characters`;
      else if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed))      e.packagingType = "Only letters, numbers, spaces, and hyphens allowed";
    }

    // Size: required, positive numeric only
    if (check("size")) {
      const trimmed = sizeValue.trim();
      if (!trimmed)                                       e.size = "Size is required";
      else if (trimmed.length > SIZE_MAX)                 e.size = `Must not exceed ${SIZE_MAX} characters`;
      else if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed) || Number(trimmed) <= 0) e.size = "Must be a valid positive number";
    }

    // Price: required, numeric, positive, within range
    if (check("price")) {
      const trimmed = price.trim();
      if (!trimmed)                                  e.price = "Price is required";
      else if (isNaN(Number(trimmed)))               e.price = "Price must be a valid number";
      else if (Number(trimmed) <= 0)                 e.price = "Price must be greater than 0";
      else if (Number(trimmed) > PRICE_MAX)          e.price = `Price must not exceed ₱${PRICE_MAX.toLocaleString()}`;
      else if (!/^\d+(\.\d{1,2})?$/.test(trimmed))  e.price = "Price must have at most 2 decimal places";
    }

    // SKU: required, uppercase alphanumeric + hyphens, min 3, max
    if (check("sku") && !isEdit) {
      const trimmed = sku.trim().toUpperCase();
      if (!trimmed)                                       e.sku = "SKU is required";
      else if (trimmed.length < 3)                        e.sku = "SKU must be at least 3 characters";
      else if (trimmed.length > SKU_MAX)                  e.sku = `SKU must not exceed ${SKU_MAX} characters`;
      else if (!/^[A-Z0-9\-_\s]+$/.test(trimmed))         e.sku = "SKU can only contain uppercase letters, numbers, spaces, and hyphens";
      else if (existingSkus.includes(trimmed)) {
        e.sku = "This SKU already exists";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleBlur(field: string) {
    setTouched((prev) => new Set(prev).add(field));
    setTimeout(() => validate(), 0);
  }

  function handleSubmit() {
    setTouched(new Set(["productId", "packagingType", "size", "price", "sku"]));
    
    // Resolve name to ID if it matches an existing product name
    let finalProductId = productId.trim();
    const matchedByName = products.find(
      (p) => p.name.toLowerCase() === finalProductId.toLowerCase() ||
             `${p.name} (${p.category})`.toLowerCase() === finalProductId.toLowerCase()
    );
    if (matchedByName) {
      finalProductId = matchedByName.id;
    }

    if (!validate(true, finalProductId)) return;

    onSubmit({
      productId: finalProductId,
      packagingType: packagingType.trim(),
      size:          `${sizeValue.trim()}${sizeUnit}`,
      price:         Number(Number(price).toFixed(2)),
      sku:           sku.trim().toUpperCase(),
      isActive,
    });
    onClose();
  }

  // Sanitize size input
  function handleSizeChange(value: string) {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) return;
    setSizeValue(sanitized);
  }

  // Sanitize price input
  function handlePriceChange(value: string) {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) return;
    setPrice(sanitized);
  }

  // Auto-uppercase SKU as user types
  function handleSkuChange(value: string) {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
    setSku(sanitized);
  }

  if (!isOpen) return null;

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Variation Price" : "Add Variation"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Product <span className="text-error-500">*</span>
              </label>
              {isEdit ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none">
                  {(() => {
                    const selectedProduct = products.find((p) => p.id === productId);
                    return selectedProduct
                      ? `${selectedProduct.name} (${selectedProduct.category})`
                      : productId || "Unknown Product";
                  })()}
                </div>
              ) : (
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  onBlur={() => handleBlur("productId")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    errors.productId ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <option value="">Select a product</option>
                  {products.filter(p => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              )}
              {errors.productId && <p className="mt-1 text-xs text-error-500 font-medium">{errors.productId}</p>}
            </div>

            {/* Packaging Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Packaging Type <span className="text-error-500">*</span>
              </label>
              {isEdit ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none">
                  {packagingType}
                </div>
              ) : (
                <select
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  onBlur={() => handleBlur("packagingType")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    errors.packagingType ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <option value="">Select packaging type</option>
                  <option value="Jar">Jar</option>
                  <option value="Container">Container</option>
                  <option value="Pouch">Pouch</option>
                </select>
              )}
              {errors.packagingType && <p className="mt-1 text-xs text-error-500 font-medium">{errors.packagingType}</p>}
            </div>

            {/* Size & Unit */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Size & Unit <span className="text-error-500">*</span>
              </label>
              {isEdit ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none">
                  {sizeValue} {sizeUnit}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    maxLength={10}
                    placeholder="e.g. 500"
                    value={sizeValue}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    onBlur={() => handleBlur("size")}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                      errors.size ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                  <select
                    value={sizeUnit}
                    onChange={(e) => setSizeUnit(e.target.value)}
                    className="w-24 px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 border-gray-200 dark:border-gray-700"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
              )}
              {errors.size && <p className="mt-1 text-xs text-error-500 font-medium">{errors.size}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Price (₱) <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={() => handleBlur("price")}
                maxLength={10}
                placeholder="0.00"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.price ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.price && <p className="mt-1 text-xs text-error-500 font-medium">{errors.price}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                SKU <span className="text-error-500">*</span>
              </label>
              {isEdit ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none">
                  {sku}
                </div>
              ) : (
                <input
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  onBlur={() => handleBlur("sku")}
                  maxLength={SKU_MAX}
                  placeholder="e.g. UBH-SM-500"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    errors.sku ? "border-error-500" : "border-gray-200 dark:border-gray-700"
                  }`}
                />
              )}
              {!isEdit && errors.sku && <p className="mt-1 text-xs text-error-500 font-medium">{errors.sku}</p>}
            </div>

            {/* Active Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between mt-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              <button
                type="button"
                disabled={isEdit}
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isActive ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"
                } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
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
            {isEdit ? "Update Price" : "Add Variation"}
          </button>
        </div>
      </div>
    </div>
  );
}
