"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { cn } from "@/lib/utils";
import { approveReview, deleteReview, getReviews, type AdminReviewRecord, type AdminReviewStatus } from "@/lib/admin-review-api";

const statusOptions: { key: AdminReviewStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
];

export default function ReviewsPage() {
  const [status, setStatus] = useState<AdminReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [items, setItems] = useState<AdminReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 1, hasNextPage: false });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getReviews({ status, page, limit })
      .then((payload) => {
        if (!alive) return;
        setItems(payload.items);
        setPagination(payload.pagination);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [limit, page, status]);

  const eyebrow = useMemo(() => {
    const total = pagination.total || 0;
    return `${total.toLocaleString()} ${status} review${total === 1 ? "" : "s"}`;
  }, [pagination.total, status]);

  const handleApprove = async (reviewId: string) => {
    setLoading(true);
    setError(null);
    try {
      await approveReview(reviewId);
      const payload = await getReviews({ status, page, limit });
      setItems(payload.items);
      setPagination(payload.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve review");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Delete this review permanently?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteReview(reviewId);
      const payload = await getReviews({ status, page, limit });
      setItems(payload.items);
      setPagination(payload.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Review moderation"
        description="Approve or delete customer reviews on coffee products. Only approved reviews appear on product pages."
        badge="Moderation"
      />

      <AdminCard title="Queue" eyebrow={eyebrow}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/6 bg-background p-2">
              {statusOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setStatus(option.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-[1.05rem] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition",
                    status === option.key ? "bg-primary/12 text-primary" : "bg-white/60 text-foreground hover:bg-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                  loading || page <= 1 ? "bg-black/5 text-muted" : "bg-white/70 text-foreground hover:bg-white",
                )}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={loading || !pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                  loading || !pagination.hasNextPage
                    ? "bg-black/5 text-muted"
                    : "bg-[linear-gradient(90deg,_#8b5a2b_0%,_#d4a271_100%)] text-white hover:opacity-95",
                )}
              >
                Next
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-hidden rounded-[1.6rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left text-sm">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Rating</th>
                    <th className="px-4 py-3 font-bold">Content</th>
                    <th className="px-4 py-3 font-bold">Images</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                        {loading ? "Loading..." : "No reviews in this queue."}
                      </td>
                    </tr>
                  ) : (
                    items.map((review) => (
                      <tr key={review.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">#{review.productId}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">{review.name}</p>
                          <p className="text-sm text-muted">{review.phoneNumber || "—"}</p>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">{review.rating.toFixed(1)}/5</td>
                        <td className="px-4 py-4">
                          <p className="max-w-[28rem] text-sm leading-6 text-muted">
                            {review.content.length > 160 ? `${review.content.slice(0, 160)}…` : review.content}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {review.images.length === 0 ? (
                            <span className="text-sm text-muted">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {review.images.slice(0, 2).map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-black/10 bg-white">
                                  <img src={url} alt="Review" className="h-10 w-10 object-cover" />
                                </a>
                              ))}
                              {review.images.length > 2 ? (
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                                  +{review.images.length - 2}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {review.status === "pending" ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void handleApprove(review.id)}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-full p-2 transition",
                                  loading ? "bg-black/5 text-muted" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                                )}
                                title="Approve"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => void handleDelete(review.id)}
                              className={cn(
                                "inline-flex items-center justify-center rounded-full p-2 transition",
                                loading ? "bg-black/5 text-muted" : "bg-rose-100 text-rose-700 hover:bg-rose-200",
                              )}
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>
      </AdminCard>
    </div>
  );
}

