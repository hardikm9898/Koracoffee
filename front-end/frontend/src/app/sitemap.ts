import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/product-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/shop",
  "/about",
  "/offers",
  "/subscribe",
  "/faq",
  "/contact",
  "/shipping",
  "/privacy",
  "/terms",
];

// Walks every page of the product catalog (backend caps limit at 30/page —
// see project-context/api-reference.md) rather than fetching just the first
// page, so the sitemap doesn't silently stop covering products once the
// catalog grows past one page.
const getAllProductIds = async (): Promise<number[]> => {
  const ids: number[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await getProducts({ page, limit: 30 });
    ids.push(...response.items.map((item) => item.id));
    hasNextPage = response.pagination.hasNextPage;
    page += 1;
  }

  return ids;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const ids = await getAllProductIds();
    productEntries = ids.map((id) => ({
      url: `${SITE_URL}/shop/${id}`,
      lastModified: new Date(),
    }));
  } catch {
    // Backend unreachable at build time — ship the static routes rather
    // than failing the whole sitemap/build.
  }

  return [...staticEntries, ...productEntries];
}
