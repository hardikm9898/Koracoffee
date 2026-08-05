export type ReviewRecord = {
  id: string;
  productId: number;
  name: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: string;
};

export type ProductReviewsResponse = {
  avgRating: number;
  reviewCount: number;
  items: ReviewRecord[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export async function getProductReviews(productId: number, limit = 10): Promise<ProductReviewsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/reviews?productId=${encodeURIComponent(String(productId))}&limit=${encodeURIComponent(String(limit))}`,
    { cache: "no-store" },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Failed to fetch reviews");
  }

  return payload.data as ProductReviewsResponse;
}

export async function createReview(input: {
  productId: number;
  name: string;
  phoneNumber?: string;
  rating: number;
  content: string;
  images?: File[];
}): Promise<{ message: string; review: ReviewRecord }> {
  const formData = new FormData();
  formData.append("productId", String(input.productId));
  formData.append("name", input.name);
  if (input.phoneNumber) formData.append("phoneNumber", input.phoneNumber);
  formData.append("rating", String(input.rating));
  formData.append("content", input.content);
  (input.images || []).forEach((file) => formData.append("images", file));

  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Failed to submit review");
  }

  return payload.data as { message: string; review: ReviewRecord };
}

