"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  type AdminSupplier,
} from "@/lib/admin-supplier-api";

const emptyForm = { name: "", contactName: "", phone: "", email: "", address: "", gstNumber: "", paymentTerms: "", notes: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminSupplier>>({});
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSuppliers(await getSuppliers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createSupplier(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (supplier: AdminSupplier) => {
    setEditingId(supplier.id);
    setDraft({ ...supplier });
  };

  const saveEdit = async (id: string) => {
    if (!draft.name?.trim()) {
      setError("Supplier name cannot be empty.");
      return;
    }
    setRowBusyId(id);
    setError(null);
    try {
      await updateSupplier(id, draft);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save supplier.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleToggleActive = async (supplier: AdminSupplier) => {
    setRowBusyId(supplier.id);
    setError(null);
    try {
      await updateSupplier(supplier.id, { active: !supplier.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update supplier status.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this supplier? This cannot be undone.")) return;
    setRowBusyId(id);
    setError(null);
    try {
      await deleteSupplier(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete supplier.");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Suppliers"
        description="Vendors you purchase raw materials, packaging, and consumables from."
        badge="Inventory"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <AdminCard title="Suppliers" eyebrow="Supplier list">
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
          <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">GST</th>
                    <th className="px-4 py-3 font-bold">Terms</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {suppliers.map((supplier) => {
                    const isEditing = editingId === supplier.id;
                    const isBusy = rowBusyId === supplier.id;

                    return (
                      <tr key={supplier.id}>
                        <td className="px-4 py-4 align-top text-sm">
                          {isEditing ? (
                            <input
                              value={draft.name ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                            />
                          ) : (
                            <p className="font-semibold text-foreground">{supplier.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                value={draft.contactName ?? ""}
                                onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                                placeholder="Contact name"
                                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                              />
                              <input
                                value={draft.phone ?? ""}
                                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                                placeholder="Phone"
                                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                              />
                              <input
                                value={draft.email ?? ""}
                                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                                placeholder="Email"
                                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                              />
                            </div>
                          ) : (
                            <>
                              <p>{supplier.contactName || "—"}</p>
                              <p className="text-xs">{supplier.phone}</p>
                              <p className="text-xs">{supplier.email}</p>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">
                          {isEditing ? (
                            <input
                              value={draft.gstNumber ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, gstNumber: e.target.value }))}
                              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                            />
                          ) : (
                            supplier.gstNumber || "—"
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted">
                          {isEditing ? (
                            <input
                              value={draft.paymentTerms ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, paymentTerms: e.target.value }))}
                              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40"
                            />
                          ) : (
                            supplier.paymentTerms || "—"
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              supplier.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {supplier.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void saveEdit(supplier.id)}
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
                                  onClick={() => startEdit(supplier)}
                                  disabled={isBusy}
                                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:text-slate-400"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleToggleActive(supplier)}
                                  disabled={isBusy}
                                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  {supplier.active ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(supplier.id)}
                                  disabled={isBusy}
                                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {suppliers.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                        No suppliers yet. Add one to get started.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="New supplier" eyebrow="Add supplier">
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Contact name</span>
              <input
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <div className="flex gap-3">
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Address</span>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <div className="flex gap-3">
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">GST number</span>
                <input
                  value={form.gstNumber}
                  onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Payment terms</span>
                <input
                  value={form.paymentTerms}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  placeholder="Net 30"
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Saving…" : "Create supplier"}
            </button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
