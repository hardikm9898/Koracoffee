"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Pencil, PlusCircle, MinusCircle, ScrollText } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createInventoryItem,
  getInventoryDashboard,
  getInventoryItems,
  updateInventoryItem,
  adjustInventoryStock,
  INVENTORY_ITEM_TYPES,
  INVENTORY_UNITS,
  type AdminInventoryDashboard,
  type AdminInventoryItem,
  type InventoryItemType,
  type InventoryUnit,
  type StockStatus,
} from "@/lib/admin-inventory-api";
import { getSuppliers, type AdminSupplier } from "@/lib/admin-supplier-api";

const TYPE_LABELS: Record<InventoryItemType, string> = {
  raw_material: "Raw material",
  packaging: "Packaging",
  consumable: "Consumable",
  other: "Other",
};

const STATUS_STYLES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-900",
  low: "bg-amber-100 text-amber-800",
  critical: "bg-orange-100 text-orange-800",
  out_of_stock: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low: "Low",
  critical: "Critical",
  out_of_stock: "Out of stock",
};

const emptyForm = {
  name: "",
  sku: "",
  type: "raw_material" as InventoryItemType,
  unit: "pcs" as InventoryUnit,
  minStock: "",
  reorderLevel: "",
  supplier: "",
  notes: "",
  openingStock: "",
  openingCost: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [dashboard, setDashboard] = useState<AdminInventoryDashboard | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminInventoryItem>>({});
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [adjustingItem, setAdjustingItem] = useState<AdminInventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"adjustment" | "damage" | "wastage" | "return">("adjustment");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, dashboardRes, suppliersRes] = await Promise.all([
        getInventoryItems({ type: (typeFilter || undefined) as InventoryItemType | undefined, search, limit: 100 }),
        getInventoryDashboard(),
        getSuppliers({ active: true }),
      ]);
      setItems(itemsRes.items);
      setDashboard(dashboardRes);
      setSuppliers(suppliersRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      setError("Name and SKU are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        sku: form.sku.trim(),
        type: form.type,
        unit: form.unit,
        minStock: form.minStock ? Number(form.minStock) : 0,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : 0,
        supplier: form.supplier || null,
        notes: form.notes.trim(),
        openingStock: form.openingStock ? Number(form.openingStock) : 0,
        openingCost: form.openingCost ? Number(form.openingCost) : 0,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create item.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: AdminInventoryItem) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      sku: item.sku,
      minStock: item.minStock,
      reorderLevel: item.reorderLevel,
      notes: item.notes,
    });
  };

  const saveEdit = async (item: AdminInventoryItem) => {
    setRowBusyId(item.id);
    setError(null);
    try {
      await updateInventoryItem(item.itemId, {
        name: draft.name?.trim(),
        sku: draft.sku?.trim(),
        minStock: draft.minStock !== undefined ? Number(draft.minStock) : undefined,
        reorderLevel: draft.reorderLevel !== undefined ? Number(draft.reorderLevel) : undefined,
        notes: draft.notes,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save item.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleAdjust = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingItem) return;
    const qty = Number(adjustQty);
    if (!qty) {
      setError("Enter a non-zero quantity.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("A reason is required.");
      return;
    }

    setRowBusyId(adjustingItem.id);
    setError(null);
    try {
      const signedQty = ["damage", "wastage"].includes(adjustType) ? -Math.abs(qty) : qty;
      await adjustInventoryStock(adjustingItem.itemId, {
        quantityChange: signedQty,
        reason: adjustReason.trim(),
        type: adjustType,
      });
      setAdjustingItem(null);
      setAdjustQty("");
      setAdjustReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to adjust stock.");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Raw inventory"
        description="Raw materials, packaging, and consumables — stock levels, costs, and every change traceable back to a ledger entry."
        badge="Inventory"
        searchValue={search}
        onSearch={(value) => setSearch(value)}
        searchPlaceholder="Search by name or SKU"
      />

      {dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminCard>
            <p className="text-sm text-muted">Total items</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground">{dashboard.totalItems}</p>
          </AdminCard>
          <AdminCard>
            <p className="text-sm text-muted">Inventory value</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground">
              ${dashboard.totalInventoryValue.toFixed(2)}
            </p>
          </AdminCard>
          <AdminCard>
            <p className="text-sm text-muted">Low stock</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-amber-700">{dashboard.lowStockCount}</p>
          </AdminCard>
          <AdminCard>
            <p className="text-sm text-muted">Critical</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-orange-700">{dashboard.criticalStockCount}</p>
          </AdminCard>
          <AdminCard>
            <p className="text-sm text-muted">Out of stock</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-rose-700">{dashboard.outOfStockCount}</p>
          </AdminCard>
        </div>
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_24rem]">
        <AdminCard title="Items" eyebrow="Catalog">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {["", ...INVENTORY_ITEM_TYPES].map((type) => (
              <button
                key={type || "all"}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  typeFilter === type
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-black/10 bg-white text-foreground/70 hover:border-primary/30"
                }`}
              >
                {type ? TYPE_LABELS[type as InventoryItemType] : "All"}
              </button>
            ))}
            <Link
              href="/inventory/ledger"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary"
            >
              <ScrollText className="h-3.5 w-3.5" /> Stock ledger
            </Link>
          </div>

          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">Item</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Stock</th>
                    <th className="px-4 py-3 font-bold">Avg cost</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {items.map((item) => {
                    const isEditing = editingId === item.id;
                    const isBusy = rowBusyId === item.id;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4 align-top text-sm">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                value={draft.name ?? ""}
                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                              />
                              <input
                                value={draft.sku ?? ""}
                                onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={draft.minStock ?? ""}
                                  onChange={(e) => setDraft((d) => ({ ...d, minStock: Number(e.target.value) }))}
                                  placeholder="Min stock"
                                  className="w-1/2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                                />
                                <input
                                  type="number"
                                  value={draft.reorderLevel ?? ""}
                                  onChange={(e) => setDraft((d) => ({ ...d, reorderLevel: Number(e.target.value) }))}
                                  placeholder="Reorder level"
                                  className="w-1/2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-foreground">{item.name}</p>
                              <p className="mt-1 text-xs text-muted">
                                SKU {item.sku} · #{item.itemId}
                              </p>
                              {item.supplier ? (
                                <p className="mt-1 text-xs text-muted">{item.supplier.name}</p>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">{TYPE_LABELS[item.type]}</td>
                        <td className="px-4 py-4 align-top text-sm text-foreground">
                          <p className="font-semibold">
                            {item.currentStock} {item.unit}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            min {item.minStock} · reorder {item.reorderLevel}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">
                          ${item.avgCost.toFixed(2)}
                          <p className="mt-1 text-xs">value ${item.stockValue.toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${STATUS_STYLES[item.status]}`}
                          >
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void saveEdit(item)}
                                  disabled={isBusy}
                                  className="inline-flex items-center justify-center rounded-full bg-primary p-2 text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-rose-300 hover:text-rose-700"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-primary/40 hover:text-primary"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingItem(item);
                                    setAdjustType("adjustment");
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                                  title="Adjust stock"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  <MinusCircle className="h-3.5 w-3.5" />
                                  Adjust
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                        No inventory items yet. Add one to get started.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard title="New item" eyebrow="Add item">
            <form onSubmit={handleCreate} className="space-y-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  placeholder="Coffee bean - Arabica"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">SKU</span>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  placeholder="RM-ARB-001"
                />
              </label>
              <div className="flex gap-3">
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Type</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as InventoryItemType }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  >
                    {INVENTORY_ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Unit</span>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as InventoryUnit }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  >
                    {INVENTORY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-3">
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Min stock</span>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </label>
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Reorder level</span>
                  <input
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Supplier</span>
                <select
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                >
                  <option value="">None</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Opening stock</span>
                  <input
                    type="number"
                    value={form.openingStock}
                    onChange={(e) => setForm((f) => ({ ...f, openingStock: e.target.value }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </label>
                <label className="block w-1/2 space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Opening cost/unit</span>
                  <input
                    type="number"
                    value={form.openingCost}
                    onChange={(e) => setForm((f) => ({ ...f, openingCost: e.target.value }))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? "Saving…" : "Create item"}
              </button>
            </form>
          </AdminCard>

          {adjustingItem ? (
            <AdminCard title={`Adjust: ${adjustingItem.name}`} eyebrow="Stock change">
              <form onSubmit={handleAdjust} className="space-y-3">
                <p className="text-xs text-muted">
                  Current: {adjustingItem.currentStock} {adjustingItem.unit}
                </p>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Type</span>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  >
                    <option value="adjustment">Correction (+/-)</option>
                    <option value="damage">Damage (-)</option>
                    <option value="wastage">Wastage (-)</option>
                    <option value="return">Return (+)</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Quantity {adjustType === "adjustment" ? "(negative to decrease)" : ""}
                  </span>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Reason</span>
                  <input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                    placeholder="Recount, spillage, supplier return..."
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={rowBusyId === adjustingItem.id}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-foreground transition hover:border-rose-300 hover:text-rose-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </AdminCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
