import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductDetailClient from "@/components/shop/ProductDetailClient";
import { getProductById } from "@/lib/product-api";

const CATEGORY_SLUG_TO_NAME: Record<string, string> = {
  "espresso": "Espresso",
  "single-origin": "Single Origin",
  "equipment": "Equipment",
};

const resolveNumericId = (id: string) => {
  const trimmed = String(id || "").trim();
  const numericId = Number(trimmed);
  return Number.isFinite(numericId) ? numericId : null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numericId = resolveNumericId(id);
  if (numericId === null) {
    return {};
  }

  const product = await getProductById(numericId);
  if (!product) {
    return {};
  }

  const image = product.images?.[0] || product.image || undefined;

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trimmed = String(id || "").trim();
  const numericId = resolveNumericId(trimmed);

  // Support footer category links like /shop/espresso by redirecting into the filter-based shop page.
  if (numericId === null) {
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
