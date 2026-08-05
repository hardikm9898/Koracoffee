"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getUserOrderHistory, type AdminUserOrderHistory } from "@/lib/admin-user-api";
import { cn } from "@/lib/utils";

const formatMoney = (value: number) => {
  const amount = Number(value) || 0;
  return `₹${amount.toFixed(2)}`;
};

export default function CustomerOrderHistoryPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [data, setData] = useState<AdminUserOrderHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    setError(null);

    getUserOrderHistory(userId, 100)
      .then((payload) => {
        if (!alive) return;
        setData(payload);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load order history");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  const title = data?.user?.name ? `${data.user.name} • Order history` : "Customer order history";

  const cadenceLabel = useMemo(() => {
    const avg = data?.summary.avgDaysBetweenOrders;
    if (!Number.isFinite(avg as number)) return "—";
    if ((avg as number) < 1) return "< 1 day";
    return `${avg} days`;
  }, [data?.summary.avgDaysBetweenOrders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Order history"
          description="View individual customer purchase behavior and frequency."
          badge="CRM view"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted">Loading order history…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Order history"
          description="View individual customer purchase behavior and frequency."
          badge="CRM view"
        />
        <AdminCard>
          <p className="font-semibold text-foreground">Unable to load customer history</p>
          <p className="mt-2 text-sm text-muted">{error || "Unknown error"}</p>
          <div className="mt-6">
            <Link
              href="/customers"
              className="inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary"
            >
              Back to customers
            </Link>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTopbar
        title={title}
        description="View individual customer purchase behavior and frequency."
        badge="CRM view"
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <AdminCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Total orders</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{data.summary.totalOrders}</p>
          <p className="mt-3 text-sm text-muted">Lifetime purchases</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Total spend</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{formatMoney(data.summary.totalSpend)}</p>
          <p className="mt-3 text-sm text-muted">Across all orders</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Avg order value</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{formatMoney(data.summary.avgOrderValue)}</p>
          <p className="mt-3 text-sm text-muted">Typical cart size</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Purchase cadence</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{cadenceLabel}</p>
          <p className="mt-3 text-sm text-muted">
            {data.summary.lastOrderAt ? `Last order ${new Date(data.summary.lastOrderAt).toLocaleDateString()}` : "No orders yet"}
          </p>
        </AdminCard>
      </div>

      <AdminCard title="Orders" eyebrow="History">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Showing {data.orders.length} order{data.orders.length === 1 ? "" : "s"} for {data.user.phoneNumber}.
            </p>
            <Link
              href="/customers"
              className="inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary"
            >
              Back to customers
            </Link>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left text-sm">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">Order</th>
                    <th className="px-4 py-3 font-bold">Placed</th>
                    <th className="px-4 py-3 font-bold">Total</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                        No orders found for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    data.orders.map((order) => (
                      <tr key={order.orderCode}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">{order.orderCode}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                            {order.shipping?.city || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatMoney(order.total)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                              order.status === "Delivered" && "bg-emerald-100 text-emerald-700",
                              order.status === "Cancelled" && "bg-rose-100 text-rose-700",
                              order.status === "Refunded" && "bg-rose-100 text-rose-700",
                              order.status !== "Delivered" && order.status !== "Cancelled" && order.status !== "Refunded" && "bg-amber-100 text-amber-700",
                            )}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-foreground">
                            {order.items
                              .slice(0, 2)
                              .map((item) => `${item.name} x${item.quantity}`)
                              .join(", ")}
                            {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
