"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

import type { Product, Variation, ProductCategory } from "@/components/module-pos/types";
import { VariationTable } from "@/components/module-pos/VariationTable";
import { VariationFormDialog } from "@/components/module-pos/VariationFormDialog";
import { fetchPriceChanges, type PriceChange, PriceHistoryDialog, PriceHistoryTable } from "@/components/module-pos/PriceHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compactSubtabClass, subtabClass, subtabListClass } from "@/components/ui/subtab-styles";
import { apiClient } from "@/components/module-pos/api";
import { useAuth } from "@/context/AuthContext";
import { useMyLocations } from "@/lib/useMyLocations";
import { POS_MODULES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Bone, ProductManagementSkeleton } from "@/components/shared/PageSkeleton";

// Products and variations come from IMS (SCMS product sync); POS only sets their selling prices.
export default function ViewProductManagement() {
  const { user: authUser, isLoading: authLoading, canRead } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [editVariation, setEditVariation] = useState<Variation | null>(null);
  const [historyVariation, setHistoryVariation] = useState<Variation | null>(null);
  const [activeTab, setActiveTab] = useState<"pricing" | "history">("pricing");
  // Bumped after a price change so the history tab reloads.
  const [historyKey, setHistoryKey] = useState(0);
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
  const hasAccess = !!authUser && canRead(POS_MODULES.PRODUCT_MANAGEMENT);
  const [history, setHistory] = useState<{ key: number; rows: PriceChange[]; error: string | null } | null>(null);
  useEffect(() => {
    if (authLoading || !hasAccess) return;
    let active = true;
    fetchPriceChanges({}).then(
      (rows) => { if (active) setHistory({ key: historyKey, rows, error: null }); },
      () => { if (active) setHistory({ key: historyKey, rows: [], error: "Could not load the price history." }); },
    );
    return () => { active = false; };
  }, [authLoading, hasAccess, historyKey]);

  const historyLoading = history?.key !== historyKey;
  const historyRows = history?.rows ?? [];
  const visibleHistory = assignedOnly ? historyRows.filter((row) => carriedIds.has(String(row.variationId))) : historyRows;
  const locationLabel = scope === "assigned"
    ? myLocations.map((l) => l.locationName).filter(Boolean).join(", ") || "Your branch"
    : "All Locations";

  // Stats: an active item without a price stays off the sales screen until it gets one.
  const activeVariations = visibleVariations.filter((v) => v.isActive);
  const needsPrice = activeVariations.filter((v) => v.price <= 0).length;
  const catalogLoading = isLoading || locationsLoading;
  const stats = [
    { label: "Active Items", value: activeVariations.length, loading: catalogLoading, color: "text-foreground" },
    { label: "Priced", value: activeVariations.length - needsPrice, loading: catalogLoading, color: "text-primary" },
    { label: "Needs Price", value: needsPrice, loading: catalogLoading, color: needsPrice > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
    {
      label: "Price Changes",
      value: history?.error
        ? <span className="text-sm text-muted-foreground">Unavailable</span>
        : visibleHistory.filter((row) => row.change != null).length,
      loading: catalogLoading || historyLoading,
      color: "text-primary",
    },
  ];

  // Only the price is editable here; everything else is owned by IMS.
  async function handlePriceSubmit(data: Omit<Variation, "id">, productImage?: string) {
    if (!editVariation) return;
    try {
      if (productImage || data.price !== editVariation.price) {
        await apiClient.apiPos.productCatalogVariationsPriceUpdate(Number(editVariation.id), {
          price: data.price,
          productImage,
        });
      }
      toast.success("Variation updated.");
      setHistoryKey((k) => k + 1);
      fetchProducts();
      setEditVariation(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving the variation.");
    }
  }

  // ── Access control ────────────────────────────────────────────────

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
          <Badge variant="secondary" className="text-primary bg-primary/10 font-bold text-xs truncate max-w-[240px]">
            {locationLabel}
          </Badge>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-5">
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2 leading-tight">
                {s.label}
              </div>
              <div aria-busy={s.loading} className={cn("text-2xl sm:text-3xl font-bold", s.color)}>
                {s.loading ? <Bone className="h-8 w-14 rounded-lg sm:h-9" /> : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pricing" | "history")} className="space-y-6">
        <TabsList className={subtabListClass}>
          {[
            { value: "pricing", label: "Pricing Configuration", short: "Pricing" },
            { value: "history", label: "Price History", short: "History" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(subtabClass, compactSubtabClass)}
            >
              <span className="md:hidden">{tab.short}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Pricing */}
        <TabsContent value="pricing" className="subtab-content space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Pricing Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Selling prices for each product variation. Use Edit to change what the branch charges and upload updated images.
            </p>
          </div>
          <VariationTable
            isLoading={isLoading || locationsLoading}
            variations={visibleVariations}
            products={visibleProducts}
            onEdit={setEditVariation}
            onHistory={setHistoryVariation}
          />
        </TabsContent>

        {/* Price history */}
        <TabsContent value="history" className="subtab-content space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Price History</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every selling price each item has had, with the price it replaced, when it changed and who changed it.
            </p>
          </div>
          <PriceHistoryTable
            key={historyKey}
            products={visibleProducts}
            changes={visibleHistory}
            isLoading={isLoading || locationsLoading || historyLoading}
            error={history?.error ?? null}
          />
        </TabsContent>
      </Tabs>

      <PriceHistoryDialog
        variation={historyVariation}
        productName={historyVariation ? products.find((p) => p.id === historyVariation.productId)?.name : undefined}
        onClose={() => setHistoryVariation(null)}
      />

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
