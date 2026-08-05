import { adminFetch } from "@/lib/admin-api";

export type AdminReviewStatus = "pending" | "approved";

export type AdminReviewRecord = {
  id: string;
  productId: number;
  name: string;
  phoneNumber?: string;
  rating: number;
  content: string;
  images: string[];
  status: AdminReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewListResponse = {
  items: AdminReviewRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }
  return payload.data as T;
};

export async function getReviews(query: { status?: AdminReviewStatus; productId?: number; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.productId !== undefined) params.set("productId", String(query.productId));
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();

  const response = await adminFetch(`/admin/reviews${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });

  return parseResponse<AdminReviewListResponse>(response);
}

export async function approveReview(reviewId: string): Promise<AdminReviewRecord> {
  const response = await adminFetch(`/admin/reviews/${reviewId}/approve`, {
    method: "PATCH",
  });

  return parseResponse<AdminReviewRecord>(response);
}

export async function deleteReview(reviewId: string): Promise<void> {
  const response = await adminFetch(`/admin/reviews/${reviewId}`, {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}

