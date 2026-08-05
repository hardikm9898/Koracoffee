"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Coffee, Heart, MapPin, ShoppingBag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/CartContext";
import { VARIANTS } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { ProductRecord } from "@/lib/product-api";
import { createReview, getProductReviews, type ReviewRecord } from "@/lib/review-api";

type ProductDetailClientProps = {
  product: ProductRecord;
};

type ProductVariantOption = {
  label: string;
  price: number;
  discountPrice?: number | null;
  stock?: number;
};

export default function ProductDetailClient({
  product,
}: ProductDetailClientProps) {
  const { addToCart, toggleFavorite, isFavorite } = useAppContext();
  const productVariants: ProductVariantOption[] =
    product.variants && product.variants.length > 0
      ? product.variants
      : VARIANTS.map((variant) => ({
          label: variant.weight,
          price: product.basePrice * variant.multiplier,
        }));
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantOption>(
    productVariants[0] ?? { label: "Default", price: product.basePrice },
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const images = product.images && product.images.length > 0
    ? product.images
    : product.image
    ? [product.image]
    : [];
  const currentImage = images[selectedImageIndex] || images[0] || null;

  useEffect(() => {
    if (images.length < 2) return;

    const interval = window.setInterval(() => {
      setSelectedImageIndex((current) => (current + 1) % images.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [images.length]);

  const displayPrice = selectedVariant.discountPrice && selectedVariant.discountPrice > 0
    ? selectedVariant.discountPrice
    : selectedVariant.price;
  const variantInStock = selectedVariant.stock === undefined
    ? product.inStock
    : selectedVariant.stock > 0;
  const favorite = isFavorite(product.id);

  const displayRating = product.avgRating ?? product.rating;
  const displayReviewCount = product.reviewCount ?? 0;

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsSummary, setReviewsSummary] = useState({ avgRating: displayRating, reviewCount: displayReviewCount });

  const [reviewName, setReviewName] = useState("");
  const [reviewPhone, setReviewPhone] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);
    setReviewsError(null);

    void getProductReviews(product.id, 12)
      .then((payload) => {
        if (!alive) return;
        setReviews(payload.items);
        setReviewsSummary({ avgRating: payload.avgRating, reviewCount: payload.reviewCount });
      })
      .catch((err) => {
        if (!alive) return;
        setReviewsError(err instanceof Error ? err.message : "Failed to load reviews");
      })
      .finally(() => {
        if (!alive) return;
        setReviewsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [product.id]);

  useEffect(() => {
    if (reviewImagePreviews.length === 0) return;
    return () => {
      reviewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewImagePreviews]);

  const onPickReviewImages = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, 4);
    setReviewImages(picked);
    setReviewImagePreviews(picked.map((file) => URL.createObjectURL(file)));
  };

  return (
    <div className="page-shell container mx-auto min-h-screen px-6 md:px-12">
      <Link
        href="/shop"
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to collection
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <section className="space-y-6">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2.5rem] border border-black/6 bg-[linear-gradient(180deg,_rgba(245,235,225,0.6)_0%,_rgba(255,255,255,0.9)_100%)] p-10 shadow-[0_24px_60px_rgba(42,28,22,0.08)]">
            <button
              type="button"
              onClick={() => toggleFavorite(product)}
              className="absolute right-5 top-5 z-10 rounded-full border border-black/6 bg-white/80 p-3 shadow-sm transition-colors hover:bg-white"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  favorite ? "fill-red-500 text-red-500" : "text-foreground",
                )}
              />
            </button>

            <AnimatePresence mode="wait">
              {currentImage ? (
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={currentImage}
                    alt={`${product.name} image`}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </motion.div>
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-full border border-primary/20 bg-white shadow-[0_20px_50px_rgba(178,124,78,0.12)]">
                  <Coffee className="h-24 w-24 text-primary/80" />
                </div>
              )}
            </AnimatePresence>
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "overflow-hidden rounded-[1.75rem] border transition",
                    selectedImageIndex === index
                      ? "border-primary"
                      : "border-black/10",
                  )}
                >
                  <img
                    src={image}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Origin" value={product.origin} />
            <InfoCard label="Process" value={product.process} />
            <InfoCard label="Altitude" value={product.altitude} />
            <InfoCard label="Best brew" value={product.serve.vessel} />
          </div>
        </section>

        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <MapPin className="h-3.5 w-3.5" />
            {product.origin}
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground md:text-6xl">
              {product.name}
            </h1>
            <p className="mt-3 text-lg text-muted">{product.notes}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              {displayRating.toFixed(1)} rating
            </div>
            <div className="text-3xl font-bold text-primary">
              ₹{displayPrice.toFixed(2)}
            </div>
            {selectedVariant.discountPrice && selectedVariant.discountPrice > 0 ? (
              <div className="text-sm font-semibold text-muted line-through">
                ₹{selectedVariant.price.toFixed(2)}
              </div>
            ) : product.originalPrice ? (
              <div className="text-sm font-semibold text-muted line-through">
                ₹{product.originalPrice.toFixed(2)}
              </div>
            ) : null}
          </div>

          <p className="text-base leading-8 text-muted">{product.description}</p>

          <div className="space-y-4 rounded-[2rem] border border-black/6 bg-white/85 p-6 shadow-[0_18px_50px_rgba(42,28,22,0.05)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Choose {product.variantAttribute ?? "variant"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {productVariants.map((variant) => (
                  <button
                    key={variant.label}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={cn(
                      "rounded-xl border px-5 py-3 text-sm font-bold transition-all",
                      selectedVariant.label === variant.label
                        ? "border-primary bg-primary text-white"
                        : "border-black/8 bg-background text-foreground hover:border-primary/30",
                    )}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Quantity
              </p>
              <div className="mt-4 inline-flex items-center rounded-xl border border-black/8 bg-background p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="h-10 w-10 rounded-lg text-xl font-semibold text-muted transition-colors hover:bg-white hover:text-foreground"
                >
                  -
                </button>
                <span className="w-12 text-center text-lg font-bold text-foreground">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  className="h-10 w-10 rounded-lg text-xl font-semibold text-muted transition-colors hover:bg-white hover:text-foreground"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  basePrice: product.basePrice,
                  price: displayPrice,
                  quantity,
                  variant: selectedVariant.label,
                  image: currentImage || "",
                })
              }
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-base font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-black/20"
              disabled={!variantInStock}
            >
              <ShoppingBag className="h-5 w-5" />
              {variantInStock
                ? `Add to cart • ₹${(displayPrice * quantity).toFixed(2)}`
                : "Out of stock"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BrewCard label="Grind" value={product.serve.grind} />
            <BrewCard label="Water temp" value={product.serve.temp} />
            <BrewCard label="Brew time" value={product.serve.time} />
            <BrewCard label="Body / sweetness" value={`${product.stats.body}/5 • ${product.stats.sweetness}/5`} />
          </div>

          <div className="mt-10 rounded-[2.2rem] border border-black/6 bg-white/85 p-7 shadow-[0_18px_50px_rgba(42,28,22,0.05)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Customer reviews</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="inline-flex items-center gap-1 rounded-full bg-coffee-light px-3 py-1 text-sm font-semibold text-foreground">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {Number(reviewsSummary.avgRating || displayRating).toFixed(1)}
                  </div>
                  <p className="text-sm text-muted">
                    {reviewsSummary.reviewCount} review{reviewsSummary.reviewCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted">Your review will appear after approval.</div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <form
                className="rounded-[1.8rem] border border-black/6 bg-background p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (submittingReview) return;
                  setSubmittingReview(true);
                  setReviewNotice(null);

                  void createReview({
                    productId: product.id,
                    name: reviewName.trim(),
                    phoneNumber: reviewPhone.trim() || undefined,
                    rating: reviewRating,
                    content: reviewContent.trim(),
                    images: reviewImages,
                  })
                    .then((payload) => {
                      setReviewNotice(payload.message || "Review submitted for moderation");
                      setReviewName("");
                      setReviewPhone("");
                      setReviewRating(5);
                      setReviewContent("");
                      setReviewImages([]);
                      setReviewImagePreviews([]);
                    })
                    .catch((err) => {
                      setReviewNotice(err instanceof Error ? err.message : "Failed to submit review");
                    })
                    .finally(() => setSubmittingReview(false));
                }}
              >
                <p className="text-sm font-bold text-foreground">Write a review</p>

                <div className="mt-4 grid gap-3">
                  <label className="space-y-2 text-sm">
                    <span className="font-semibold text-foreground">Name</span>
                    <input
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-semibold text-foreground">Phone (optional)</span>
                    <input
                      value={reviewPhone}
                      onChange={(e) => setReviewPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">Rating</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const value = idx + 1;
                        const active = value <= reviewRating;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReviewRating(value)}
                            className={cn(
                              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-black/10 bg-white text-muted hover:text-primary",
                            )}
                            aria-label={`Rate ${value} star`}
                          >
                            <Star className={cn("h-5 w-5", active && "fill-primary")} />
                          </button>
                        );
                      })}
                      <span className="text-sm font-semibold text-foreground">{reviewRating}/5</span>
                    </div>
                  </div>
                  <label className="space-y-2 text-sm">
                    <span className="font-semibold text-foreground">Review</span>
                    <textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="What did you love? Flavor notes, brew method, experience..."
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-semibold text-foreground">Images (optional)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => onPickReviewImages(e.target.files)}
                      className="w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-primary hover:file:bg-primary/15"
                    />
                    {reviewImagePreviews.length > 0 ? (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {reviewImagePreviews.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                            <img src={url} alt="Selected review image" className="h-20 w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </label>
                </div>

                {reviewNotice ? <p className="mt-4 text-sm text-muted">{reviewNotice}</p> : null}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-black/20"
                >
                  {submittingReview ? "Submitting..." : "Submit review"}
                </button>
              </form>

              <div className="rounded-[1.8rem] border border-black/6 bg-background p-5">
                <p className="text-sm font-bold text-foreground">Approved reviews</p>
                {reviewsError ? (
                  <p className="mt-4 text-sm text-rose-700">{reviewsError}</p>
                ) : reviewsLoading ? (
                  <p className="mt-4 text-sm text-muted">Loading...</p>
                ) : reviews.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">No approved reviews yet. Be the first to leave one.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[1.4rem] border border-black/6 bg-white/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{review.name}</p>
                          <div className="inline-flex items-center gap-1 rounded-full bg-coffee-light px-3 py-1 text-sm font-semibold text-foreground">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            {review.rating.toFixed(1)}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted">{review.content}</p>
                        {review.images.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {review.images.slice(0, 6).map((url) => (
                              <div key={url} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                                <img src={url} alt="Review image" className="h-24 w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-black/6 bg-white/85 p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BrewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-black/6 bg-background p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
