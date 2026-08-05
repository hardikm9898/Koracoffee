"use client";

import { useEffect, useState } from "react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getAuditLog, type AdminAuditLogEntry } from "@/lib/admin-audit-log-api";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 50;

export default function AuditLogPage() {
  const [items, setItems] = useState<AdminAuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await getAuditLog({ page, limit: DEFAULT_LIMIT });
        if (!ignore) {
          setItems(response.items);
          setPagination(response.pagination);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unable to load audit log");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Audit log"
        description="Every create/update/delete action taken by an admin, in order. Read-only — records who, what endpoint, when, and whether it succeeded."
        badge="Security"
      />

      <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        This records <em>what happened</em>, not <em>whether it should have been allowed</em> — every admin is
        currently equal (a single phone-number allowlist), so there is no permission model to audit against yet.
      </div>

      <AdminCard title="Actions" eyebrow="Most recent first">
        {error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-[1.6rem] border border-black/6">
              <div className="admin-table-wrap">
                <table className="admin-table min-w-full divide-y divide-black/6 text-left text-sm">
                  <thead className="bg-background">
                    <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                      <th className="px-4 py-3 font-bold">When</th>
                      <th className="px-4 py-3 font-bold">Admin</th>
                      <th className="px-4 py-3 font-bold">Action</th>
                      <th className="px-4 py-3 font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/6 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                          Loading…
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                          No admin actions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-4 text-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-4 text-foreground">{entry.adminPhone || "—"}</td>
                          <td className="px-4 py-4 font-mono text-xs text-foreground">
                            {entry.method} {entry.path}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                                entry.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                              )}
                            >
                              {entry.statusCode}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                    loading || page <= 1
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "border border-black/10 bg-white text-foreground hover:bg-slate-50",
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
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "border border-black/10 bg-white text-foreground hover:bg-slate-50",
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
