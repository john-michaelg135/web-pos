"use client";

import { useState, useEffect } from "react";
import type { Product, Variation, ProductCategory } from "@/components/module-pos/types";
import { ProductTable }         from "@/components/module-pos/ProductTable";
import { VariationTable }       from "@/components/module-pos/VariationTable";
import { ProductFormDialog }    from "@/components/module-pos/ProductFormDialog";
import { VariationFormDialog }  from "@/components/module-pos/VariationFormDialog";
import { DeleteConfirmDialog }  from "@/components/module-pos/DeleteConfirmDialog";
import { apiClient } from "@/components/module-pos/api";
import { toast } from "sonner";

type ViewTab = "products" | "variations";

export default function ViewProductManagement() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [products,   setProducts]   = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [activeTab,  setActiveTab]  = useState<ViewTab>("products");

  // Dialog state
  const [showProductDialog,   setShowProductDialog]   = useState(false);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [editProduct,         setEditProduct]         = useState<Product | null>(null);
  const [editVariation,       setEditVariation]       = useState<Variation | null>(null);
  const [deleteTarget,        setDeleteTarget]        = useState<{ type: "product" | "variation", item: Product | Variation } | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.apiPos.productCatalogProductsList();
      
      const mappedProducts: Product[] = [];
      const mappedVariations: Variation[] = [];
      
      data.forEach(p => {
        mappedProducts.push({
          id: p.productId?.toString() || "0",
          name: p.productName || "Unknown",
          category: (p.productCategory as ProductCategory) || "Ube Halaya",
          description: p.productDescription || "",
          isActive: !!p.isActive,
          createdAt: new Date().toISOString()
        });

        p.variations?.forEach(v => {
          let sku = v.variationName || "";
          let packagingType = "Unknown";
          let size = "Unknown";
          
          if (sku.includes("|")) {
            const parts = sku.split("|");
            sku = parts[0];
            packagingType = parts[1] || "Unknown";
            size = parts[2] || "Unknown";
          }
          
          mappedVariations.push({
            id: v.variationId?.toString() || "0",
            productId: p.productId?.toString() || "0",
            packagingType,
            size,
            price: Number(v.currentPrice) || 0,
            sku,
            isActive: !!v.isActive
          });
        });
      });
      
      setProducts(mappedProducts);
      setVariations(mappedVariations);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchProducts();
  }, []);

  // Stats
  const totalProducts  = products.length;
  const activeProducts = products.filter((p) => p.isActive).length;
  const inactiveProducts = totalProducts - activeProducts;
  const totalVariations  = variations.length;
  const activeVariations = variations.filter((v) => v.isActive).length;
  const inactiveVariations = totalVariations - activeVariations;

  const stats = activeTab === "products" ? [
    { label: "Total Products", value: totalProducts, color: "text-gray-900 dark:text-white" },
    { label: "Active", value: activeProducts, color: "text-success-600 dark:text-success-400" },
    { label: "Inactive", value: inactiveProducts, color: "text-gray-500 dark:text-gray-400" },
  ] : [
    { label: "Total Variations", value: totalVariations, color: "text-gray-900 dark:text-white" },
    { label: "Active", value: activeVariations, color: "text-success-600 dark:text-success-400" },
    { label: "Inactive", value: inactiveVariations, color: "text-gray-500 dark:text-gray-400" },
  ];

  // ── Product CRUD ──────────────────────────────────────────────────

  async function handleProductSubmit(data: Omit<Product, "id" | "createdAt">) {
    try {
      if (editProduct) {
        await apiClient.apiPos.productCatalogProductsUpdate(Number(editProduct.id), {
          productName: data.name,
          productCategory: data.category,
          productDescription: data.description,
          isActive: data.isActive
        });
        
        toast.success("Product updated successfully.");
      } else {
        const { data: product } = await apiClient.apiPos.productCatalogProductsCreate({
          productName: data.name,
          productCategory: data.category,
          productDescription: data.description
        });
        
        toast.success("Product created successfully.");
      }
      fetchProducts();
      setShowProductDialog(false);
      setEditProduct(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving the product.");
    }
  }

  function openEditProduct(product: Product) {
    setEditProduct(product);
    setShowProductDialog(true);
  }

  function openAddProduct() {
    setEditProduct(null);
    setShowProductDialog(true);
  }

  function handleProductDelete(product: Product) {
    setDeleteTarget({ type: "product", item: product });
  }

  // ── Variation CRUD ────────────────────────────────────────────────

  async function handleVariationSubmit(data: Omit<Variation, "id">) {
    try {
      const variationName = `${data.sku}|${data.packagingType}|${data.size}`;
      
      if (editVariation) {
        await apiClient.apiPos.productCatalogVariationsUpdate(Number(editVariation.id), {
          variationName,
          isActive: data.isActive
        });
        // Update price separately if changed
        if (data.price !== editVariation.price) {
          await apiClient.apiPos.productCatalogVariationsPriceUpdate(Number(editVariation.id), {
            price: data.price
          });
        }
        toast.success("Variation updated successfully.");
      } else {
        await apiClient.apiPos.productCatalogProductsVariationsCreate(Number(data.productId), {
          variationName,
          initialPrice: data.price
        });
        toast.success("Variation created successfully.");
      }
      fetchProducts();
      setShowVariationDialog(false);
      setEditVariation(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving the variation.");
    }
  }

  function openEditVariation(variation: Variation) {
    setEditVariation(variation);
    setShowVariationDialog(true);
  }

  function openAddVariation() {
    setEditVariation(null);
    setShowVariationDialog(true);
  }

  function handleVariationDelete(variation: Variation) {
    setDeleteTarget({ type: "variation", item: variation });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "product") {
        const product = deleteTarget.item as Product;
        await apiClient.apiPos.productCatalogProductsUpdate(Number(product.id), { isActive: false });
        toast.success("Product deleted successfully.");
      } else {
        const variation = deleteTarget.item as Variation;
        await apiClient.apiPos.productCatalogVariationsUpdate(Number(variation.id), { isActive: false });
        toast.success("Variation deleted successfully.");
      }
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting.");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Product Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage products and variations · Admin only
          </p>
        </div>
        <button
          onClick={activeTab === "products" ? openAddProduct : openAddVariation}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          {activeTab === "products" ? "Add Product" : "Add Variation"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm"
          >
            <div className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 sm:mb-2">
              {s.label}
            </div>
            <div className={`text-xl sm:text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all
            ${activeTab === "products"
              ? "bg-white dark:bg-gray-800 text-brand-500 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("variations")}
          className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all
            ${activeTab === "variations"
              ? "bg-white dark:bg-gray-800 text-brand-500 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
        >
          Variations
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === "products" && (
            <ProductTable products={products} onEdit={openEditProduct} onDelete={handleProductDelete} />
          )}

          {activeTab === "variations" && (
            <VariationTable variations={variations} products={products} onEdit={openEditVariation} onDelete={handleVariationDelete} />
          )}
        </>
      )}
      </div>

      {/* Dialogs */}
      <ProductFormDialog
        isOpen={showProductDialog}
        onClose={() => { setShowProductDialog(false); setEditProduct(null); }}
        onSubmit={handleProductSubmit}
        initial={editProduct}
      />

      <VariationFormDialog
        isOpen={showVariationDialog}
        onClose={() => { setShowVariationDialog(false); setEditVariation(null); }}
        onSubmit={handleVariationSubmit}
        initial={editVariation}
        products={products}
        existingSkus={variations.map((v) => v.sku.toUpperCase())}
      />

      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={
          deleteTarget?.type === "product"
            ? `Are you sure you want to soft-delete product ${(deleteTarget.item as Product).name}?`
            : deleteTarget?.type === "variation"
            ? `Are you sure you want to soft-delete variation ${(deleteTarget.item as Variation).sku}?`
            : ""
        }
      />
    </div>
  );
}
