"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  EXPENSE_CATEGORIES,
  type AdminExpense,
  type ExpenseCategory,
} from "@/lib/admin-expense-api";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  shipping: "Shipping",
  labour: "Labour",
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  platform_fees: "Platform fees",
  misc: "Miscellaneous",
  other: "Other",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<ExpenseCategory>("rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExpenses({ category: categoryFilter || undefined, limit: 100 });
      setExpenses(res.items);
      setTotalAmount(res.totalAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createExpense({
        category,
        amount: numericAmount,
        date: date || undefined,
        vendor: vendor.trim(),
        reference: reference.trim(),
        paymentMethod: paymentMethod.trim(),
        notes: notes.trim(),
      });
      setAmount("");
      setDate("");
      setVendor("");
      setReference("");
      setPaymentMethod("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense: AdminExpense) => {
    if (!window.confirm("Delete this expense?")) return;
    setRowBusyId(expense.id);
    setError(null);
    try {
      await deleteExpense(expense.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete expense.");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Expenses"
        description="Operational costs — rent, labour, marketing, shipping, and fees. Raw material and packaging costs live in Purchases instead, so nothing here double-counts COGS."
        badge="Finance"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <AdminCard title="Expenses" eyebrow={`Total: $${totalAmount.toFixed(2)}`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {["", ...EXPENSE_CATEGORIES].map((c) => (
              <button
                key={c || "all"}
                type="button"
                onClick={() => setCategoryFilter(c as ExpenseCategory | "")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  categoryFilter === c
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-black/10 bg-white text-foreground/70 hover:border-primary/30"
                }`}
              >
                {c ? CATEGORY_LABELS[c as ExpenseCategory] : "All"}
              </button>
            ))}
          </div>

          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full divide-y divide-black/6 text-left">
                <thead className="bg-background">
                  <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Vendor</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Reference</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6 bg-white">
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3 text-sm text-muted">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{CATEGORY_LABELS[expense.category]}</td>
                      <td className="px-4 py-3 text-sm text-muted">{expense.vendor || "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">${expense.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-muted">{expense.reference || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => void handleDelete(expense)}
                          disabled={rowBusyId === expense.id}
                          className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                        No expenses logged yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Log expense" eyebrow="Add">
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3">
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Amount</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Vendor</span>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <div className="flex gap-3">
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Reference</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block w-1/2 space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Payment method</span>
                <input
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
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
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Saving…" : "Log expense"}
            </button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
