export type ProductVariantRecord = {
  label: string;
  price: number;
  discountPrice?: number | null;
  stock?: number;
};

export type ProductRecord = {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  originalPrice?: number | null;
  inStock: boolean;
  rating: number;
  avgRating?: number | null;
  reviewCount?: number;
  notes: string;
  description: string;
  origin: string;
  altitude: string;
  process: string;
  image?: string | null;
  images?: string[];
  featured?: boolean;
  stats: {
    acidity: number;
    body: number;
    sweetness: number;
    complexity: number;
    finish: number;
  };
  serve: {
    vessel: string;
    grind: string;
    temp: string;
    time: string;
  };
  variantAttribute?: string;
  variants?: ProductVariantRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProductListResponse = {
  items: ProductRecord[];
  filters: {
    categories: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type CategoryRecord = {
  id: string;
  name: string;
  image?: string;
  active: boolean;
};

type ProductQuery = {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const buildQueryString = (query: ProductQuery) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const stringified = params.toString();
  return stringified ? `?${stringified}` : "";
};

export async function getProducts(
  query: ProductQuery = {},
): Promise<ProductListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/products${buildQueryString(query)}`,
    {
      cache: "no-store",
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Failed to fetch products");
  }

  return payload.data as ProductListResponse;
}

export async function getProductById(
  productId: number,
): Promise<ProductRecord | null> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Failed to fetch product");
  }

  return payload.data as ProductRecord;
}

export async function getCategories(): Promise<CategoryRecord[]> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Failed to fetch categories");
  }

  return payload.data as CategoryRecord[];
}
