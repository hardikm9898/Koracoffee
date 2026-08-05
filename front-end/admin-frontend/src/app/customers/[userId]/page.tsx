"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  getUserOrderHistory,
  updateUser,
  deleteUser,
  type AdminUserOrderHistory,
} from "@/lib/admin-user-api";
import { cn } from "@/lib/utils";

const formatMoney = (value: number) => {
  const amount = Number(value) || 0;
  return `₹${amount.toFixed(2)}`;
};

export default function CustomerOrderHistoryPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const router = useRouter();

  const [data, setData] = useState<AdminUserOrderHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wires up updateUser/deleteUser from admin-user-api.ts — both were
  // already fully implemented and working against the backend, but no
  // admin page ever called them, so there was no way to actually edit or
  // delete a customer despite the API fully supporting it.
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountDraft, setAccountDraft] = useState({ name: "", phoneNumber: "", isVerified: false });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    setError(null);

    getUserOrderHistory(userId, 100)
      .then((payload) => {
        if (!alive) return;
        setData(payload);
        setAccountDraft({
          name: payload.user.name,
          phoneNumber: payload.user.phoneNumber,
          isVerified: payload.user.isVerified,
        });
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

  const handleSaveAccount = async () => {
    if (!userId) return;
    if (!accountDraft.name.trim() || !accountDraft.phoneNumber.trim()) {
      setAccountError("Name and phone number are required.");
      return;
    }

    setAccountSaving(true);
    setAccountError(null);
    try {
      const updated = await updateUser(userId, {
        name: accountDraft.name.trim(),
        phoneNumber: accountDraft.phoneNumber.trim(),
        isVerified: accountDraft.isVerified,
      });
      setData((current) => (current ? { ...current, user: { ...current.user, ...updated } } : current));
      setIsEditingAccount(false);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Unable to update customer.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    const confirmed = window.confirm(
      "Delete this customer account? This cannot be undone and does not delete their past orders.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setAccountError(null);
    try {
      await deleteUser(userId);
      router.push("/customers");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Unable to delete customer.");
      setDeleting(false);
    }
  };

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

      <AdminCard title="Account" eyebrow="Customer details">
        {isEditingAccount ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Name</span>
                <input
                  value={accountDraft.name}
                  onChange={(event) => setAccountDraft((d) => ({ ...d, name: event.target.value }))}
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Phone number</span>
                <input
                  value={accountDraft.phoneNumber}
                  onChange={(event) => setAccountDraft((d) => ({ ...d, phoneNumber: event.target.value }))}
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={accountDraft.isVerified}
                onChange={(event) => setAccountDraft((d) => ({ ...d, isVerified: event.target.checked }))}
                className="h-4 w-4 rounded border-black/20"
              />
              <span className="font-medium text-foreground">Verified</span>
            </label>
            {accountError ? <p className="text-sm text-rose-700">{accountError}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSaveAccount()}
                disabled={accountSaving}
                className="inline-flex items-center justify-center rounded-full bg-emerald-950 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {accountSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingAccount(false);
                  setAccountError(null);
                  if (data) {
                    setAccountDraft({
                      name: data.user.name,
                      phoneNumber: data.user.phoneNumber,
                      isVerified: data.user.isVerified,
                    });
                  }
                }}
                disabled={accountSaving}
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-foreground">{data.user.name}</p>
              <p className="mt-1 text-sm text-muted">{data.user.phoneNumber}</p>
              <span
                className={cn(
                  "mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                  data.user.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                )}
              >
                {data.user.isVerified ? "Verified" : "Unverified"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsEditingAccount(true)}
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-emerald-900 hover:text-emerald-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete customer"}
              </button>
            </div>
          </div>
        )}
        {!isEditingAccount && accountError ? <p className="mt-4 text-sm text-rose-700">{accountError}</p> : null}
      </AdminCard>

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
