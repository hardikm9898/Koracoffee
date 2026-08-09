"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  getInventoryLedger,
  LEDGER_TRANSACTION_TYPES,
  type AdminInventoryTransaction,
  type LedgerTransactionType,
  type Pagination,
} from "@/lib/admin-inventory-api";

const TYPE_STYLES: Record<LedgerTransactionType, string> = {
  opening: "bg-slate-100 text-slate-700",
  purchase: "bg-emerald-100 text-emerald-900",
  consumption: "bg-sky-100 text-sky-700",
  adjustment: "bg-amber-100 text-amber-800",
  damage: "bg-rose-100 text-rose-700",
  wastage: "bg-rose-100 text-rose-700",
  return: "bg-emerald-100 text-emerald-900",
};

export default function InventoryLedgerPage() {
  const [transactions, setTransactions] = useState<AdminInventoryTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getInventoryLedger({
          type: (type || undefined) as LedgerTransactionType | undefined,
          page,
          limit: 50,
        });
        setTransactions(result.items);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load stock ledger.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [type, page]);

  return (
    <div className="space-y-6">
      <AdminTopbar title="Stock ledger" description="Every stock change, immutable and traceable — purchases, consumption, damage, wastage, and manual corrections." badge="Inventory" />

      <Link
        href="/inventory"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to items
      </Link>

      <AdminCard title="Transactions" eyebrow="Ledger">
        <div className="mb-4 flex flex-wrap gap-2">
          {["", ...LEDGER_TRANSACTION_TYPES].map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                type === t
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-black/10 bg-white text-foreground/70 hover:border-primary/30"
              }`}
            >
              {t || "All"}
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
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Change</th>
                  <th className="px-4 py-3 font-bold">Before → After</th>
                  <th className="px-4 py-3 font-bold">Cost</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 bg-white">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-sm text-muted">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <p className="font-semibold">{tx.item?.name ?? "—"}</p>
                      <p className="text-xs text-muted">{tx.item?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${TYPE_STYLES[tx.type]}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${tx.quantityChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {tx.quantityChange >= 0 ? "+" : ""}
                      {tx.quantityChange} {tx.item?.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {tx.beforeStock} → {tx.afterStock}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">${tx.totalCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{tx.reason || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted">{tx.adminPhone || "system"}</td>
                  </tr>
                ))}
                {transactions.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}
