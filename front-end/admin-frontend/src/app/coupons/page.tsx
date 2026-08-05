"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, X, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
  type AdminCouponRecord,
  type AdminCouponInput,
} from "@/lib/admin-coupon-api";

const COUPON_TYPES: { value: AdminCouponInput["type"]; label: string }[] = [
  { value: "percent", label: "Percent off" },
  { value: "flat", label: "Flat amount off" },
  { value: "shipping", label: "Free shipping" },
];

type DraftCoupon = {
  code: string;
  type: AdminCouponInput["type"];
  value: string;
  label: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
};

const EMPTY_DRAFT: DraftCoupon = {
  code: "",
  type: "percent",
  value: "",
  label: "",
  minOrderAmount: "0",
  maxUses: "",
  expiresAt: "",
};

const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "");

const draftFromCoupon = (coupon: AdminCouponRecord): DraftCoupon => ({
  code: coupon.code,
  type: coupon.type,
  value: String(coupon.value),
  label: coupon.label,
  minOrderAmount: String(coupon.minOrderAmount),
  maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
  expiresAt: toDateInputValue(coupon.expiresAt),
});

const draftToInput = (draft: DraftCoupon): AdminCouponInput => ({
  code: draft.code.trim().toUpperCase(),
  type: draft.type,
  value: Number(draft.value) || 0,
  label: draft.label.trim(),
  minOrderAmount: Number(draft.minOrderAmount) || 0,
  maxUses: draft.maxUses.trim() === "" ? null : Number(draft.maxUses),
  expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
});

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<AdminCouponRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCoupon, setNewCoupon] = useState<DraftCoupon>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCoupon>(EMPTY_DRAFT);
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getCoupons();
      setCoupons(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.label.trim()) {
      setError("Code and label are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createCoupon(draftToInput(newCoupon));
      setNewCoupon(EMPTY_DRAFT);
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (coupon: AdminCouponRecord) => {
    setEditingId(coupon.id);
    setDraft(draftFromCoupon(coupon));
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const handleSave = async (couponId: string) => {
    if (!draft.code.trim() || !draft.label.trim()) {
      setError("Code and label are required.");
      return;
    }

    setRowLoadingId(couponId);
    setError(null);
    try {
      await updateCoupon(couponId, draftToInput(draft));
      await loadCoupons();
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save coupon.");
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleToggleActive = async (coupon: AdminCouponRecord) => {
    setRowLoadingId(coupon.id);
    setError(null);
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update coupon status.");
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    const confirmed = window.confirm("Delete this coupon? This cannot be undone.");
    if (!confirmed) return;

    setRowLoadingId(couponId);
    setError(null);
    try {
      await deleteCoupon(couponId);
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete coupon.");
    } finally {
      setRowLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Coupon management"
        description="Create and manage discount codes. Replaces what used to be hardcoded, duplicated (and, for percent-off codes, miscalculated) coupon logic across the backend and both frontends."
        badge="Marketing"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <AdminCard>
          <p className="text-sm text-muted">Total coupons</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground">{coupons.length}</p>
          <p className="mt-4 text-sm leading-6 text-muted">
            Active coupons are shown to customers on their profile page and can be applied at checkout.
            Usage counts increment automatically when an order using the code is placed.
          </p>
        </AdminCard>

        <AdminCard title="New coupon" eyebrow="Add coupon">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Code</span>
                <input
                  value={newCoupon.code}
                  onChange={(event) => setNewCoupon((c) => ({ ...c, code: event.target.value }))}
                  placeholder="AURA20"
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Type</span>
                <select
                  value={newCoupon.type}
                  onChange={(event) =>
                    setNewCoupon((c) => ({ ...c, type: event.target.value as AdminCouponInput["type"] }))
                  }
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                >
                  {COUPON_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Label (shown to customers)</span>
              <input
                value={newCoupon.label}
                onChange={(event) => setNewCoupon((c) => ({ ...c, label: event.target.value }))}
                placeholder="20% off your order"
                className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {newCoupon.type !== "shipping" && (
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">
                  {newCoupon.type === "percent" ? "Percent (0-100)" : "Amount (₹)"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={newCoupon.type === "percent" ? 100 : undefined}
                  value={newCoupon.value}
                  onChange={(event) => setNewCoupon((c) => ({ ...c, value: event.target.value }))}
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Min order (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={newCoupon.minOrderAmount}
                  onChange={(event) => setNewCoupon((c) => ({ ...c, minOrderAmount: event.target.value }))}
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Max uses (blank = unlimited)</span>
                <input
                  type="number"
                  min={1}
                  value={newCoupon.maxUses}
                  onChange={(event) => setNewCoupon((c) => ({ ...c, maxUses: event.target.value }))}
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Expires (blank = never)</span>
              <input
                type="date"
                value={newCoupon.expiresAt}
                onChange={(event) => setNewCoupon((c) => ({ ...c, expiresAt: event.target.value }))}
                className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-950 px-6 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {submitting ? "Saving…" : "Create coupon"}
            </button>
          </form>
        </AdminCard>
      </div>

      <AdminCard title="Coupons" eyebrow="Coupon list">
        <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full divide-y divide-black/6 text-left">
              <thead className="bg-background">
                <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-bold">Code</th>
                  <th className="px-4 py-3 font-bold">Type / Value</th>
                  <th className="px-4 py-3 font-bold">Label</th>
                  <th className="px-4 py-3 font-bold">Usage</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 bg-white">
                {coupons.map((coupon) => {
                  const isEditing = editingId === coupon.id;
                  const isBusy = rowLoadingId === coupon.id;

                  return (
                    <tr key={coupon.id}>
                      <td className="px-4 py-4 align-top text-sm">
                        {isEditing ? (
                          <input
                            value={draft.code}
                            onChange={(event) => setDraft((d) => ({ ...d, code: event.target.value }))}
                            className="w-full rounded-3xl border border-black/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                          />
                        ) : (
                          <span className="font-mono font-bold text-foreground">{coupon.code}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <select
                              value={draft.type}
                              onChange={(event) =>
                                setDraft((d) => ({ ...d, type: event.target.value as AdminCouponInput["type"] }))
                              }
                              className="w-full rounded-3xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                            >
                              {COUPON_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            {draft.type !== "shipping" && (
                              <input
                                type="number"
                                value={draft.value}
                                onChange={(event) => setDraft((d) => ({ ...d, value: event.target.value }))}
                                className="w-full rounded-3xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                              />
                            )}
                          </div>
                        ) : (
                          <span>
                            {coupon.type === "percent"
                              ? `${coupon.value}% off`
                              : coupon.type === "flat"
                                ? `₹${coupon.value} off`
                                : "Free shipping"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted">
                        {isEditing ? (
                          <input
                            value={draft.label}
                            onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))}
                            className="w-full rounded-3xl border border-black/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                          />
                        ) : (
                          coupon.label
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted">
                        {coupon.usedCount}
                        {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            coupon.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {coupon.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <div className="flex min-w-[180px] flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleSave(coupon.id)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full bg-emerald-950 p-2 text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                                title="Save"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Cancel"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(coupon)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-emerald-900 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleActive(coupon)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-emerald-900 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title={coupon.active ? "Deactivate" : "Activate"}
                              >
                                {coupon.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(coupon.id)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 hover:text-rose-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                      No coupons have been created yet. Add one to get started.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
