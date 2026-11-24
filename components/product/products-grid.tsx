import { cn } from "cn";
import { Suspense } from "react";

import { ProductCard, ProductCardSkeleton } from "@/components/product-card/product-card";
import { Link } from "@/components/ui/link";
import { getCollectionResults } from "@/lib/collections/server";
import { getSearchIndexProducts } from "@/lib/product/server";

interface ProductsGridSkeletonProps {
  count: number;
  className?: string;
}

export function ProductsGridSkeleton({ count, className }: ProductsGridSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-5 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

interface ProductsGridProps {
  // Lists a Shopify collection instead of the search index, which lags behind new products.
  collection?: string;
  collectionUrl?: string;
  eagerCount?: number;
  limit: number;
  title: string;
  variant?: "grid" | "rail";
}

export function ProductsGrid({
  collection,
  collectionUrl,
  eagerCount = 0,
  limit,
  title,
  variant = "grid",
}: ProductsGridProps) {
  return (
    <div className="grid gap-4">
      {title ? (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl">{title}</h2>
          {collectionUrl && (
            <Link
              href={collectionUrl}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              View All
            </Link>
          )}
        </div>
      ) : null}
      <Suspense fallback={<ProductsGridSkeleton count={limit} />}>
        <ProductsGridContent
          collection={collection}
          eagerCount={eagerCount}
          limit={limit}
          outOfStockText="Out of Stock"
          variant={variant}
        />
      </Suspense>
    </div>
  );
}

async function ProductsGridContent({
  collection,
  eagerCount,
  limit,
  outOfStockText,
  variant,
}: {
  collection?: string;
  eagerCount: number;
  limit: number;
  outOfStockText: string;
  variant: "grid" | "rail";
}) {
  // Use the search index (not the products connection) so these match the first items on /collections/all.
  const { products } = collection
    ? await getCollectionResults({ handle: collection })
    : await getSearchIndexProducts({ limit });
  if (products.length === 0) return null;
  return (
    <div
      className={
        variant === "rail"
          ? "-mx-5 grid snap-x snap-mandatory auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:auto-cols-[44%] lg:-mx-10 lg:auto-cols-[30%] lg:px-10"
          : "grid grid-cols-2 gap-4 lg:grid-cols-4"
      }
    >
      {products.slice(0, limit).map((product, index) => (
        <ProductCard
          className={variant === "rail" ? "snap-start" : undefined}
          key={product.id}
          loading={index < eagerCount ? "eager" : "lazy"}
          product={product}
          outOfStockText={outOfStockText}
          quickShopText="Choose"
        />
      ))}
    </div>
  );
}
