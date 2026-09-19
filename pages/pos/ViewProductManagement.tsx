"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Product, Variation, ProductCategory } from "@/components/module-pos/types";
import { ProductTable } from "@/components/module-pos/ProductTable";
import { VariationTable } from "@/components/module-pos/VariationTable";
import { ProductFormDialog } from "@/components/module-pos/ProductFormDialog";
import { VariationFormDialog } from "@/components/module-pos/VariationFormDialog";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { apiClient } from "@/components/module-pos/api";
import { useAuth } from "@/context/AuthContext";
import { POS_MODULES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ViewTab = "products" | "variations";

export default function ViewProductManagement() {
  const { user: authUser, isLoading: authLoading, canRead } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>("products");

  // Dialog state
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editVariation, setEditVariation] = useState<Variation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "product" | "variation"; item: Product | Variation } | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.apiPos.productCatalogProductsList();

      const mappedProducts: Product[] = [];
      const mappedVariations: Variation[] = [];

      data.forEach((p) => {
        mappedProducts.push({
          id: p.productId?.toString() || "0",
          name: p.productName || "Unknown",
          category: (p.productCategory as ProductCategory) || "Ube Halaya",
          description: p.productDescription || "",
          isActive: !!p.isActive,
          createdAt: new Date().toISOString(),
        });

        p.variations?.forEach((v) => {
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
            isActive: !!v.isActive,
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
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isActive).length;
  const inactiveProducts = totalProducts - activeProducts;
  const totalVariations = variations.length;
  const activeVariations = variations.filter((v) => v.isActive).length;
  const inactiveVariations = totalVariations - activeVariations;

  const stats =
    activeTab === "products"
      ? [
          { label: "Total Products", value: totalProducts, color: "text-foreground" },
          { label: "Active", value: activeProducts, color: "text-success-600 dark:text-success-400" },
          { label: "Inactive", value: inactiveProducts, color: "text-muted-foreground" },
        ]
      : [
          { label: "Total Variations", value: totalVariations, color: "text-foreground" },
          { label: "Active", value: activeVariations, color: "text-success-600 dark:text-success-400" },
          { label: "Inactive", value: inactiveVariations, color: "text-muted-foreground" },
        ];

  // ── Product CRUD ──────────────────────────────────────────────────

  async function handleProductSubmit(data: Omit<Product, "id" | "createdAt">) {
    try {
      if (editProduct) {
        await apiClient.apiPos.productCatalogProductsUpdate(Number(editProduct.id), {
          productName: data.name,
          productCategory: data.category,
          productDescription: data.description,
          isActive: data.isActive,
        });
        toast.success("Product updated successfully.");
      } else {
        await apiClient.apiPos.productCatalogProductsCreate({
          productName: data.name,
          productCategory: data.category,
          productDescription: data.description,
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
          isActive: data.isActive,
        });
        if (data.price !== editVariation.price) {
          await apiClient.apiPos.productCatalogVariationsPriceUpdate(Number(editVariation.id), {
            price: data.price,
          });
        }
        toast.success("Variation updated successfully.");
      } else {
        await apiClient.apiPos.productCatalogProductsVariationsCreate(Number(data.productId), {
          variationName,
          initialPrice: data.price,
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

  // ── Access control ────────────────────────────────────────────────

  const hasAccess = !!authUser && canRead(POS_MODULES.PRODUCT_MANAGEMENT);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace("/access-denied");
    }
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) return null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 max-w-7xl mx-auto animate-page-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">
            Product Management
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Manage products and variations</p>
            <Badge variant="secondary" className="text-xs font-bold">
              Global Catalog
            </Badge>
          </div>
        </div>
        <Button onClick={activeTab === "products" ? openAddProduct : openAddVariation}>
          <Plus className="h-4 w-4 mr-1.5" />
          {activeTab === "products" ? "Add Product" : "Add Variation"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {s.label}
              </div>
              <div className={cn("text-3xl font-bold", s.color)}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center bg-muted p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("products")}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "products"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("variations")}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "variations"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Variations
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeTab === "products" && <ProductTable products={products} />}
          {activeTab === "variations" && (
            <VariationTable variations={variations} products={products} onEdit={openEditVariation} />
          )}
        </>
      )}

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
