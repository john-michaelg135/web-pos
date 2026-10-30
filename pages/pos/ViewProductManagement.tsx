"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Product, Variation, ProductCategory } from "@/components/module-pos/types";
import { VariationTable } from "@/components/module-pos/VariationTable";
import { VariationFormDialog } from "@/components/module-pos/VariationFormDialog";
import { apiClient } from "@/components/module-pos/api";
import { useAuth } from "@/context/AuthContext";
import { useMyLocations } from "@/lib/useMyLocations";
import { POS_MODULES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ProductManagementSkeleton, ProductTableSkeleton } from "@/components/shared/PageSkeleton";

// Products and variations come from IMS (SCMS product sync); POS only sets their selling prices.
export default function ViewProductManagement() {
  const { user: authUser, isLoading: authLoading, canRead } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [editVariation, setEditVariation] = useState<Variation | null>(null);
  // Variations with a stock record at each location, for branch staff's view.
  const [stockedAt, setStockedAt] = useState<Map<number, Set<string>> | null>(null);
  const { scope, locations: myLocations, isLoading: locationsLoading } = useMyLocations();

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const [{ data }, stockResult] = await Promise.all([
        apiClient.apiPos.productCatalogProductsList(),
        apiClient.apiPos.inventoryStockAllList().catch((err) => {
          console.error("Failed to load stock locations:", err);
          return null;
        }),
      ]);
      if (stockResult) {
        const byLocation = new Map<number, Set<string>>();
        stockResult.data.forEach((s) => {
          const loc = Number(s.locationId);
          if (!byLocation.has(loc)) byLocation.set(loc, new Set());
          byLocation.get(loc)!.add(String(s.variationId));
        });
        setStockedAt(byLocation);
      }

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
    fetchProducts();
  }, []);

  // Branch staff see only what their branch(es) carry: items with a stock record there.
  // The owner sees the whole catalog, so items can be priced before their first delivery.
  // If the stock list couldn't load, fall back to the full catalog rather than an empty page.
  const assignedOnly = scope === "assigned" && stockedAt !== null;
  const carriedIds = new Set(myLocations.flatMap((l) => [...(stockedAt?.get(Number(l.locationId)) ?? [])]));
  const visibleVariations = assignedOnly ? variations.filter((v) => carriedIds.has(v.id)) : variations;
  const visibleProducts = assignedOnly
    ? products.filter((p) => visibleVariations.some((v) => v.productId === p.id))
    : products;
  const locationLabel = scope === "assigned"
    ? myLocations.map((l) => l.locationName).filter(Boolean).join(", ") || "Your branch"
    : "All Locations";

  // Stats: an active item without a price stays off the sales screen until it gets one.
  const activeVariations = visibleVariations.filter((v) => v.isActive);
  const needsPrice = activeVariations.filter((v) => v.price <= 0).length;
  const stats = [
    { label: "Active Items", value: activeVariations.length, color: "text-foreground" },
    { label: "Priced", value: activeVariations.length - needsPrice, color: "text-success-600 dark:text-success-400" },
    { label: "Needs Price", value: needsPrice, color: needsPrice > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
  ];

  // Only the price is editable here; everything else is owned by IMS.
  async function handlePriceSubmit(data: Omit<Variation, "id">) {
    if (!editVariation) return;
    try {
      if (data.price !== editVariation.price) {
        await apiClient.apiPos.productCatalogVariationsPriceUpdate(Number(editVariation.id), {
          price: data.price,
        });
      }
      toast.success("Price updated.");
      fetchProducts();
      setEditVariation(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving the price.");
    }
  }

  // ── Access control ────────────────────────────────────────────────

  const hasAccess = !!authUser && canRead(POS_MODULES.PRODUCT_MANAGEMENT);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace("/no-access");
    }
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <ProductManagementSkeleton />;

  if (!hasAccess) return null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 animate-page-in">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-bold tracking-tight text-foreground">
          Product Management
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-muted-foreground">Set selling prices for products from IMS</p>
          <Badge variant="secondary" className="text-primary bg-primary/10 font-bold text-xs whitespace-nowrap">
            Pricing Configuration
          </Badge>
          <Badge variant="secondary" className="text-primary bg-primary/10 font-bold text-xs truncate max-w-[240px]">
            {locationLabel}
          </Badge>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-5">
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2 leading-tight">
                {s.label}
              </div>
              <div className={cn("text-2xl sm:text-3xl font-bold", s.color)}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing table */}
      {isLoading || locationsLoading ? (
        <ProductTableSkeleton tab="variations" />
      ) : (
        <VariationTable variations={visibleVariations} products={visibleProducts} onEdit={setEditVariation} />
      )}

      <VariationFormDialog
        isOpen={editVariation !== null}
        onClose={() => setEditVariation(null)}
        onSubmit={handlePriceSubmit}
        initial={editVariation}
        products={products}
        existingSkus={variations.map((v) => v.sku.toUpperCase())}
      />
    </div>
  );
}
