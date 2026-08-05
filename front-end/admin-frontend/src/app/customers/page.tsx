"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { customerSegments } from "@/lib/admin-data";
import { getUsers, type AdminUserRecord } from "@/lib/admin-user-api";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await getUsers({
          page,
          limit,
          search: search.trim() || undefined,
        });
        setCustomers(response.items);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [limit, page, search]);

  const resultsLabel = useMemo(() => {
    const total = pagination.total || 0;
    if (!search.trim()) return `${total.toLocaleString()} registered customers`;
    return `${total.toLocaleString()} matches for "${search.trim()}"`;
  }, [pagination.total, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Customer intelligence"
          description="Guide retention, service prioritization, and targeting with a focused CRM-facing dashboard."
          badge="CRM view"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted">Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Customer intelligence"
          description="Guide retention, service prioritization, and targeting with a focused CRM-facing dashboard."
          badge="CRM view"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-500">
              <p className="font-medium">Error loading customers</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Customer intelligence"
        description="Guide retention, service prioritization, and targeting with a focused CRM-facing dashboard."
        badge="CRM view"
        searchValue={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search by name or phone number"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminCard title="Key segments" eyebrow="Audience map">
          <div className="space-y-4">
            {customerSegments.map((segment) => (
              <div key={segment.name} className="rounded-[1.4rem] border border-black/6 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{segment.name}</p>
                  <span className="text-sm font-bold text-primary">{segment.size}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{segment.note}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  {segment.spend} • Loyalty {segment.loyalty}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Customer list" eyebrow={resultsLabel}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">List of all registered customers with contact info and join date.</p>
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

            <div className="overflow-hidden rounded-[1.6rem] border border-black/6">
              <div className="admin-table-wrap">
                <table className="admin-table min-w-full divide-y divide-black/6 text-left text-sm">
                  <thead className="bg-background">
                    <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                      <th className="px-4 py-3 font-bold">Customer</th>
                      <th className="px-4 py-3 font-bold">Phone</th>
                      <th className="px-4 py-3 font-bold">Joined</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/6 bg-white">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                          {search.trim() ? "No customers match your search." : "No customers yet."}
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-foreground">{customer.name}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                              {customer.addressesCount} address{customer.addressesCount === 1 ? "" : "es"}
                              {customer.lastLoginAt ? ` • Last login ${new Date(customer.lastLoginAt).toLocaleDateString()}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-foreground">{customer.phoneNumber}</td>
                          <td className="px-4 py-4 text-sm text-foreground">{new Date(customer.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                                customer.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {customer.isVerified ? "Verified" : "Unverified"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-foreground transition hover:border-primary/30 hover:text-primary"
                            >
                              Orders
                            </Link>
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
    </div>
  );
}
