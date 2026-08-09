"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, XCircle, PlusCircle, Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createPurchase,
  confirmPurchase,
  cancelPurchase,
  updatePurchase,
  getPurchases,
  PAYMENT_STATUSES,
  type AdminPurchase,
  type PaymentStatus,
  type PurchaseStatus,
} from "@/lib/admin-purchase-api";
import { getSuppliers, type AdminSupplier } from "@/lib/admin-supplier-api";
import { getInventoryItems, type AdminInventoryItem } from "@/lib/admin-inventory-api";

type DraftLine = { itemId: string; quantity: string; unitCost: string; taxAmount: string; discountAmount: string };

const emptyLine: DraftLine = { itemId: "", quantity: "", unitCost: "", taxAmount: "", discountAmount: "" };

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  confirmed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-700",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-rose-100 text-rose-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-900",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ ...emptyLine }]);
  const [shippingCost, setShippingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchasesRes, suppliersRes, itemsRes] = await Promise.all([
        getPurchases({ status: statusFilter || undefined, limit: 50 }),
        getSuppliers({ active: true }),
        getInventoryItems({ active: true, limit: 200 }),
      ]);
      setPurchases(purchasesRes.items);
      setSuppliers(suppliersRes);
      setItems(itemsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load purchases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const lineTotal = (line: DraftLine) => {
    const qty = Number(line.quantity) || 0;
    const cost = Number(line.unitCost) || 0;
    const tax = Number(line.taxAmount) || 0;
    const discount = Number(line.discountAmount) || 0;
    return qty * cost + tax - discount;
  };

  const draftTotal =
    lines.reduce((sum, line) => sum + lineTotal(line), 0) + (Number(shippingCost) || 0) + (Number(otherCost) || 0);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierId) {
      setError("Select a supplier.");
      return;
    }
    const validLines = lines.filter((l) => l.itemId && l.quantity && l.unitCost);
    if (validLines.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createPurchase({
        supplier: supplierId,
        items: validLines.map((l) => ({
          itemId: Number(l.itemId),
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
          taxAmount: Number(l.taxAmount) || 0,
          discountAmount: Number(l.discountAmount) || 0,
        })),
        shippingCost: Number(shippingCost) || 0,
        otherCost: Number(otherCost) || 0,
        notes: notes.trim(),
      });
      setSupplierId("");
      setLines([{ ...emptyLine }]);
      setShippingCost("");
      setOtherCost("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (purchase: AdminPurchase) => {
    if (!window.confirm(`Confirm ${purchase.purchaseNumber}? This will add its items to stock.`)) return;
    setRowBusyId(purchase.id);
    setError(null);
    try {
      await confirmPurchase(purchase.purchaseId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm purchase.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCancel = async (purchase: AdminPurchase) => {
    const message =
      purchase.status === "confirmed"
        ? `Cancel ${purchase.purchaseNumber}? This will reverse the stock it added — it will fail if that stock has already been used.`
        : `Cancel draft ${purchase.purchaseNumber}?`;
    if (!window.confirm(message)) return;

    setRowBusyId(purchase.id);
    setError(null);
    try {
      await cancelPurchase(purchase.purchaseId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel purchase.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handlePaymentStatus = async (purchase: AdminPurchase, paymentStatus: PaymentStatus) => {
    setRowBusyId(purchase.id);
    setError(null);
    try {
      await updatePurchase(purchase.purchaseId, { paymentStatus });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payment status.");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Purchases"
        description="Raw-material purchase orders — stock only increases once a purchase is confirmed as received."
        badge="Inventory"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_26rem]">
        <AdminCard title="Purchase orders" eyebrow="History">
          <div className="mb-4 flex flex-wrap gap-2">
            {["", "draft", "confirmed", "cancelled"].map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setStatusFilter(s as PurchaseStatus | "")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  statusFilter === s
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-black/10 bg-white text-foreground/70 hover:border-primary/30"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>

          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">PO</th>
                    <th className="px-4 py-3 font-bold">Supplier</th>
                    <th className="px-4 py-3 font-bold">Items</th>
                    <th className="px-4 py-3 font-bold">Total</th>
                    <th className="px-4 py-3 font-bold">Payment</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {purchases.map((purchase) => {
                    const isBusy = rowBusyId === purchase.id;
                    return (
                      <tr key={purchase.id}>
                        <td className="px-4 py-4 align-top text-sm">
                          <p className="font-semibold text-foreground">{purchase.purchaseNumber}</p>
                          <p className="text-xs text-muted">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">{purchase.supplier?.name ?? "—"}</td>
                        <td className="px-4 py-4 align-top text-sm text-muted">
                          {purchase.items.map((line) => (
                            <p key={line.item}>
                              {line.itemName} × {line.quantity} {line.unit}
                            </p>
                          ))}
                        </td>
                        <td className="px-4 py-4 align-top text-sm font-semibold text-foreground">
                          ${purchase.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          {purchase.status === "cancelled" ? (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${PAYMENT_STYLES[purchase.paymentStatus]}`}>
                              {purchase.paymentStatus}
                            </span>
                          ) : (
                            <select
                              value={purchase.paymentStatus}
                              disabled={isBusy}
                              onChange={(e) => void handlePaymentStatus(purchase, e.target.value as PaymentStatus)}
                              className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${PAYMENT_STYLES[purchase.paymentStatus]}`}
                            >
                              {PAYMENT_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${STATUS_STYLES[purchase.status]}`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <div className="flex flex-wrap gap-2">
                            {purchase.status === "draft" ? (
                              <button
                                type="button"
                                onClick={() => void handleConfirm(purchase)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                                title="Confirm receipt — increases stock"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                              </button>
                            ) : null}
                            {purchase.status !== "cancelled" ? (
                              <button
                                type="button"
                                onClick={() => void handleCancel(purchase)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {purchases.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                        No purchase orders yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="New purchase order" eyebrow="Draft">
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Supplier</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Line items</span>
              {lines.map((line, index) => (
                <div key={index} className="space-y-2 rounded-2xl border border-black/8 p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={line.itemId}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, itemId: e.target.value } : l)))
                      }
                      className="w-full rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                    >
                      <option value="">Select item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.itemId}>
                          {item.name} ({item.sku})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="shrink-0 rounded-full border border-rose-200 bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-100"
                      title="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))
                      }
                      className="rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                    />
                    <input
                      type="number"
                      placeholder="Unit cost"
                      value={line.unitCost}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitCost: e.target.value } : l)))
                      }
                      className="rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                    />
                    <input
                      type="number"
                      placeholder="Tax"
                      value={line.taxAmount}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, taxAmount: e.target.value } : l)))
                      }
                      className="rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                    />
                    <input
                      type="number"
                      placeholder="Discount"
                      value={line.discountAmount}
                      onChange={(e) =>
                        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, discountAmount: e.target.value } : l)))
                      }
                      className="rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                    />
                  </div>
                  <p className="text-right text-xs text-muted">Line total: ${lineTotal(line).toFixed(2)}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add line
              </button>
            </div>

            <div className="flex gap-3">
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Shipping cost</span>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Other cost</span>
                <input
                  type="number"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>

            <p className="text-right text-sm font-semibold text-foreground">Estimated total: ${draftTotal.toFixed(2)}</p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Saving…" : "Save as draft"}
            </button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
