import { API_BASE_URL, parseApiResponse } from "./api-client";

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

export async function getProductReviews(productId: number, limit = 10): Promise<ProductReviewsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/reviews?productId=${encodeURIComponent(String(productId))}&limit=${encodeURIComponent(String(limit))}`,
    { cache: "no-store" },
  );

  return parseApiResponse<ProductReviewsResponse>(response, "Failed to fetch reviews");
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

  return parseApiResponse<{ message: string; review: ReviewRecord }>(
    response,
    "Failed to submit review",
  );
}

