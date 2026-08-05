import { notFound, redirect } from "next/navigation";
import ProductDetailClient from "@/components/shop/ProductDetailClient";
import { getProductById } from "@/lib/product-api";

const CATEGORY_SLUG_TO_NAME: Record<string, string> = {
  "espresso": "Espresso",
  "single-origin": "Single Origin",
  "equipment": "Equipment",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trimmed = String(id || "").trim();
  const numericId = Number(trimmed);

  // Support footer category links like /shop/espresso by redirecting into the filter-based shop page.
  if (!Number.isFinite(numericId)) {
    const slug = trimmed.toLowerCase();
    const category = CATEGORY_SLUG_TO_NAME[slug];
    if (category) {
      redirect(`/shop?category=${encodeURIComponent(category)}`);
    }
    notFound();
  }

  const product = await getProductById(numericId);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
