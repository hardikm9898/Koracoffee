"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Coffee,
  Heart,
  LayoutGrid,
  List,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/context/CartContext";
import { VARIANTS } from "@/lib/data";
import { getProducts, type ProductRecord } from "@/lib/product-api";
import { cn } from "@/lib/utils";

type SortOption =
  | "featured"
  | "best-selling"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "date-old"
  | "date-new";

const PAGE_SIZE = 10;

const sortLabels: Record<SortOption, string> = {
  featured: "Featured",
  "best-selling": "Best selling",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  "price-asc": "Price low to high",
  "price-desc": "Price high to low",
  "date-old": "Oldest first",
  "date-new": "Newest first",
};

export default function ShopClient() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category") || "All";
  const { addToCart, isFavorite, toggleFavorite } = useAppContext();

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState(categoryFromUrl);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("100");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    let ignore = false;

    const loadInitialProducts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getProducts({
          page: 1,
          limit: PAGE_SIZE,
          category: category === "All" ? undefined : category,
          search: deferredSearch || undefined,
          sort,
          inStock: inStockOnly ? true : undefined,
          minPrice: Number(minPrice) || 0,
          maxPrice: Number(maxPrice) || 100,
        });

        if (ignore) return;

        setProducts(response.items);
        setCategories(response.filters.categories);
        setTotal(response.pagination.total);
        setHasNextPage(response.pagination.hasNextPage);
        setPage(1);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load products");
          setProducts([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialProducts();

    return () => {
      ignore = true;
    };
  }, [category, deferredSearch, sort, inStockOnly, minPrice, maxPrice]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        setIsLoadingMore(true);

        void getProducts({
          page: page + 1,
          limit: PAGE_SIZE,
          category: category === "All" ? undefined : category,
          search: deferredSearch || undefined,
          sort,
          inStock: inStockOnly ? true : undefined,
          minPrice: Number(minPrice) || 0,
          maxPrice: Number(maxPrice) || 100,
        })
          .then((response) => {
            setProducts((current) => [...current, ...response.items]);
            setCategories(response.filters.categories);
            setTotal(response.pagination.total);
            setHasNextPage(response.pagination.hasNextPage);
            setPage(response.pagination.page);
          })
          .catch((loadError) => {
            setError(loadError instanceof Error ? loadError.message : "Unable to load more products");
          })
          .finally(() => {
            setIsLoadingMore(false);
          });
      },
      { rootMargin: "280px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    category,
    deferredSearch,
    hasNextPage,
    inStockOnly,
    isLoading,
    isLoadingMore,
    maxPrice,
    minPrice,
    page,
    sort,
  ]);

  useEffect(() => {
    setImageIndexes((current) => {
      const updated = { ...current };
      products.forEach((product) => {
        if (updated[product.id] === undefined) {
          updated[product.id] = 0;
        }
      });
      return updated;
    });
  }, [products]);

  useEffect(() => {
    if (products.length === 0) return;

    const interval = window.setInterval(() => {
      setImageIndexes((current) => {
        const next = { ...current };
        products.forEach((product) => {
          const imageCount = product.images?.length ?? (product.image ? 1 : 0);
          if (!imageCount) return;
          next[product.id] = ((next[product.id] ?? 0) + 1) % imageCount;
        });
        return next;
      });
    }, 3800);

    return () => window.clearInterval(interval);
  }, [products]);

  const updateQuantity = (productId: number, delta: number) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(1, (current[productId] || 1) + delta),
    }));
  };

  return (
    <div className="page-shell container mx-auto min-h-screen px-4 sm:px-6 md:px-12">
      {/* Search Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <label className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search origin, notes, or coffee name..."
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-11 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:bg-white shadow-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setCategory("All");
            setSearch("");
            setSort("featured");
            setInStockOnly(false);
            setMinPrice("0");
            setMaxPrice("100");
          }}
          className="w-full sm:w-auto rounded-2xl border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-black/5"
        >
          Reset
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-[2rem] border border-black/6 bg-white/88 p-6 shadow-[0_18px_50px_rgba(42,28,22,0.05)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Category</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["All", ...categories].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                    category === item
                      ? "border-primary bg-primary text-white"
                      : "border-black/8 bg-background text-foreground hover:border-primary/30",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="h-4 w-4 rounded border-black/20 text-primary focus:ring-primary"
              />
              Show only in-stock products
            </label>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Price range</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                inputMode="numeric"
                className="rounded-xl border border-black/8 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40"
                placeholder="Min"
              />
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                inputMode="numeric"
                className="rounded-xl border border-black/8 bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40"
                placeholder="Max"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Sort</p>
            <div className="mt-4 space-y-2">
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSort(option)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                    sort === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-black/8 bg-background text-foreground hover:border-primary/30",
                  )}
                >
                  {sortLabels[option]}
                  <ChevronDown className={cn("h-4 w-4", sort === option && "rotate-180")} />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[1.8rem] border border-black/6 bg-white/88 p-5 shadow-[0_18px_50px_rgba(42,28,22,0.05)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Results</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {isLoading ? "Loading..." : `${products.length} loaded of ${total}`}
              </p>
            </div>
            <div className="inline-flex w-max items-center rounded-xl border border-black/8 bg-background p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  view === "grid" ? "bg-white text-primary shadow-sm" : "text-muted",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  view === "list" ? "bg-white text-primary shadow-sm" : "text-muted",
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[360px] animate-pulse rounded-[2rem] border border-black/6 bg-white/60"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-[2rem] border border-black/6 bg-white/88 p-10 text-center shadow-[0_18px_50px_rgba(42,28,22,0.05)]">
              <Coffee className="mx-auto h-12 w-12 text-primary/50" />
              <h2 className="mt-4 text-2xl font-bold text-foreground">No products found</h2>
              <p className="mt-3 text-sm text-muted">
                Try a different search or widen the price range.
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-6",
                  view === "grid"
                    ? "md:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1",
                )}
              >
                {products.map((product) => {
                  const productVariants =
                    (product.variants && product.variants.length > 0
                      ? product.variants
                      : VARIANTS.map((variantOption) => ({
                          label: variantOption.weight,
                          price: product.basePrice * variantOption.multiplier,
                        }))) as Array<{ label: string; price: number; discountPrice?: number | null; stock?: number }>;
                  const selectedWeight =
                    selectedVariants[product.id] ?? productVariants[0]?.label ?? "250g";
                  const selectedVariant =
                    productVariants.find((item) => item.label === selectedWeight) ||
                    productVariants[0]!;
                  const quantity = quantities[product.id] || 1;
                  const imageIndex = imageIndexes[product.id] ?? 0;
                  const productImage = product.images?.[imageIndex] ?? product.images?.[0] ?? product.image;
                  const displayPrice = selectedVariant.discountPrice && selectedVariant.discountPrice > 0
                    ? selectedVariant.discountPrice
                    : selectedVariant.price;
                  const variantInStock = selectedVariant.stock === undefined
                    ? product.inStock
                    : selectedVariant.stock > 0;

                  return (
                    <article
                      key={product.id}
                      className={cn(
                        "overflow-hidden rounded-[2rem] border border-black/6 bg-white shadow-[0_18px_50px_rgba(42,28,22,0.05)] transition-transform hover:-translate-y-1",
                        view === "list" && "md:grid md:grid-cols-[260px_1fr]",
                      )}
                    >
                      <Link
                        href={`/shop/${product.id}`}
                        className="relative flex min-h-[240px] items-center justify-center bg-[linear-gradient(180deg,_rgba(245,235,225,0.8)_0%,_rgba(255,255,255,1)_100%)] p-8"
                      >
                        {productImage ? (
                          <Image
                            src={productImage}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <Coffee className="h-20 w-20 text-primary/70" />
                        )}
                        <span className="absolute left-4 top-4 rounded-full border border-primary/20 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          {product.category}
                        </span>
                      </Link>

                      <div className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link href={`/shop/${product.id}`}>
                              <h3 className="text-xl font-bold tracking-[-0.03em] text-foreground transition-colors hover:text-primary">
                                {product.name}
                              </h3>
                            </Link>
                            <p className="mt-2 text-sm text-muted">{product.notes}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(product)}
                            className="rounded-full border border-black/8 bg-background p-2 transition-colors hover:border-primary/30"
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4",
                                isFavorite(product.id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-foreground",
                              )}
                            />
                          </button>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              ₹{displayPrice.toFixed(2)}
                            </p>
                            {product.originalPrice ? (
                              <p className="text-sm text-muted line-through">
                                ₹{product.originalPrice.toFixed(2)}
                              </p>
                            ) : null}
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-coffee-light px-3 py-1 text-sm font-semibold text-foreground">
                            <Check className="h-3.5 w-3.5 text-primary" />
                            {(product.avgRating ?? product.rating).toFixed(1)}
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {productVariants.map((variantOption) => (
                            <button
                              key={`${product.id}-${variantOption.label}`}
                              type="button"
                              onClick={() =>
                                setSelectedVariants((current) => ({
                                  ...current,
                                  [product.id]: variantOption.label,
                                }))
                              }
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition-all",
                                selectedWeight === variantOption.label
                                  ? "border-primary bg-primary text-white"
                                  : "border-black/8 bg-background text-foreground",
                              )}
                            >
                              {variantOption.label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                          <div className="inline-flex items-center rounded-xl border border-black/8 bg-background p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, -1)}
                              className="h-9 w-9 rounded-lg text-muted transition-colors hover:bg-white hover:text-foreground"
                            >
                              <Minus className="mx-auto h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-bold text-foreground">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, 1)}
                              className="h-9 w-9 rounded-lg text-muted transition-colors hover:bg-white hover:text-foreground"
                            >
                              <Plus className="mx-auto h-4 w-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={!variantInStock}
                            onClick={() =>
                              addToCart({
                                id: product.id,
                                name: product.name,
                                basePrice: product.basePrice,
                                price: displayPrice,
                                quantity,
                                variant: selectedWeight,
                                image: productImage || "",
                              })
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-black/20"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            {variantInStock ? "Add to cart" : "Out of stock"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div ref={sentinelRef} className="h-10" />
              {isLoadingMore ? (
                <div className="pb-10 text-center text-sm font-medium text-muted">
                  Loading more coffee...
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
