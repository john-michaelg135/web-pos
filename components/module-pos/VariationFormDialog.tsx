"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Variation, Product } from "@/components/module-pos/types";

import { CustomSelect } from "@/components/module-pos/CustomSelect";

interface VariationFormDialogProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSubmit: (variation: Omit<Variation, "id">, productImage?: string) => Promise<void>;
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
  const [ready,         setReady]         = useState(false);

  const [file, setFile] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState("");

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setFile(undefined);
    setImageError("");
    if (!isOpen) {
      setReady(false);
      return;
    }
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
    setReady(true);
  }, [initial, isOpen]);

  function validate(allFields = false, checkProductId = productId): boolean {
    const e: FormErrors = {};
    const check = (field: string) => allFields || touched.has(field);

    // Product: required
    if (check("productId") && !isEdit) {
      if (!checkProductId.trim()) e.productId = "Product is required";
    }

    // Packaging Type: required, min 2, max, letters/numbers/spaces only
    if (!isEdit && check("packagingType")) {
      const trimmed = packagingType.trim();
      if (!trimmed)                                       e.packagingType = "Packaging type is required";
      else if (trimmed.length < 2)                        e.packagingType = "Must be at least 2 characters";
      else if (trimmed.length > PKG_MAX)                  e.packagingType = `Must not exceed ${PKG_MAX} characters`;
      else if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed))      e.packagingType = "Only letters, numbers, spaces, and hyphens allowed";
    }

    // Size: required, positive numeric only
    if (!isEdit && check("size")) {
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

  async function handleSubmit() {
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

    setSaving(true);
    try {
      let productImage: string | undefined;
      if (file) {
        const bitmap = await createImageBitmap(file);
        try {
          const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Image conversion failed");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          productImage = canvas.toDataURL("image/jpeg", 0.85);
        } finally {
          bitmap.close();
        }
      }
      await onSubmit({
        productId: finalProductId,
        packagingType: packagingType.trim(),
        size:          `${sizeValue.trim()}${sizeUnit}`,
        price:         Number(Number(price).toFixed(2)),
        sku:           sku.trim().toUpperCase(),
        isActive,
      }, productImage);
    } catch {
      setImageError("Could not read the image. Choose a JPEG, PNG, or WebP file.");
    } finally {
      setSaving(false);
    }
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

  if (!isOpen || !ready) return null;

  const isEdit = !!initial;

  const modalContent = (
    <>
      <div
        onClick={saving ? undefined : onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "calc(100% - 32px)",
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
          <div className="flex items-center justify-between gap-3">
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
              {isEdit ? "Edit Variation" : "Add Variation"}
            </h2>
            <ModalCloseButton onClick={() => { if (!saving) onClose(); }} />
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Product <span className="text-destructive">*</span>
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
                <CustomSelect
                  value={productId}
                  onChange={(val) => {
                    setProductId(val);
                    handleBlur("productId");
                  }}
                  className={`w-full text-sm ${errors.productId ? "border-destructive" : ""}`}
                  options={[
                    { value: "", label: "Select a product" },
                    ...products.filter(p => p.isActive).map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.category})`
                    }))
                  ]}
                />
              )}
              {errors.productId && <p className="mt-1 text-xs text-destructive font-medium">{errors.productId}</p>}
            </div>

            {/* Packaging Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Packaging Type <span className="text-destructive">*</span>
              </label>
              {isEdit ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none">
                  {packagingType}
                </div>
              ) : (
                <CustomSelect
                  value={packagingType}
                  onChange={(val) => {
                    setPackagingType(val);
                    handleBlur("packagingType");
                  }}
                  className={`w-full text-sm ${errors.packagingType ? "border-destructive" : ""}`}
                  options={[
                    { value: "", label: "Select packaging type" },
                    { value: "Jar", label: "Jar" },
                    { value: "Container", label: "Container" },
                    { value: "Pouch", label: "Pouch" },
                  ]}
                />
              )}
              {errors.packagingType && <p className="mt-1 text-xs text-destructive font-medium">{errors.packagingType}</p>}
            </div>

            {/* Size & Unit */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Size & Unit <span className="text-destructive">*</span>
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
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring ${
                      errors.size ? "border-destructive" : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                  <CustomSelect
                    value={sizeUnit}
                    onChange={(val) => setSizeUnit(val)}
                    className="w-24 text-sm"
                    options={[
                      { value: "g", label: "g" },
                      { value: "kg", label: "kg" },
                      { value: "ml", label: "ml" },
                      { value: "L", label: "L" },
                      { value: "oz", label: "oz" },
                    ]}
                  />
                </div>
              )}
              {errors.size && <p className="mt-1 text-xs text-destructive font-medium">{errors.size}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Price (₱) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={() => handleBlur("price")}
                maxLength={10}
                placeholder="0.00"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.price ? "border-destructive" : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.price && <p className="mt-1 text-xs text-destructive font-medium">{errors.price}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                SKU <span className="text-destructive">*</span>
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
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.sku ? "border-destructive" : "border-gray-200 dark:border-gray-700"
                  }`}
                />
              )}
              {!isEdit && errors.sku && <p className="mt-1 text-xs text-destructive font-medium">{errors.sku}</p>}
            </div>

            {isEdit && (
              <div className="sm:col-span-2">
                <label className="block w-fit">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Product photo
                  </span>
                  <span className="relative flex h-36 w-36 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-center hover:border-primary focus-within:ring-2 focus-within:ring-ring dark:border-gray-600 dark:bg-gray-800">
                    {preview && <img src={preview} alt="" className="absolute inset-0 block h-full w-full object-contain" />}
                    <span className={preview ? "absolute inset-x-0 bottom-0 bg-black/65 py-1.5 text-sm font-semibold text-white" : "text-sm font-semibold text-gray-700 dark:text-gray-200"}>
                      {preview ? "Change photo" : "Add a photo"}
                    </span>
                    {!preview && <span className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG or WebP</span>}
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving}
                      className="sr-only"
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        if (selected) {
                          setFile(selected);
                          setImageError("");
                        }
                      }} />
                  </span>
                </label>
                {imageError && <p role="alert" className="mt-1 text-xs text-destructive">{imageError}</p>}
              </div>
            )}

            {/* Active Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between mt-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              <button
                type="button"
                disabled={isEdit}
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
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
        <div style={{ padding: "12px 24px", borderTop: "1px solid #e4e4e7", display: "flex", justifyContent: "flex-end", gap: 8, backgroundColor: "#fafafa", borderRadius: "0 0 12px 12px", flexShrink: 0 }}>
          <button
            onClick={saving ? undefined : onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            {isEdit ? "Update" : "Add Variation"}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
