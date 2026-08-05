"use client";

import { useEffect, useMemo, useState } from "react";
import AdminCard from "@/components/admin/AdminCard";
import { getSalesOverviewData, type AdminSalesOverview, type AdminSalesOverviewPeriod } from "@/lib/admin-data";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const PERIODS: { key: AdminSalesOverviewPeriod; label: string; helper: string }[] = [
  { key: "daily", label: "Daily", helper: "Last 7 days" },
  { key: "weekly", label: "Weekly", helper: "Last 8 weeks" },
  { key: "monthly", label: "Monthly", helper: "Last 12 months" },
];

const formatMoneyCompact = (value: number) => {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${amount.toFixed(0)}`;
};

export default function SalesOverviewCard() {
  const [period, setPeriod] = useState<AdminSalesOverviewPeriod>("daily");
  const [data, setData] = useState<AdminSalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getSalesOverviewData(period)
      .then((payload) => {
        if (!alive) return;
        setData(payload);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load sales overview");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [period]);

  const maxRevenue = useMemo(() => {
    if (!data?.series?.length) return 0;
    return Math.max(...data.series.map((point) => point.revenue));
  }, [data]);

  const periodMeta = PERIODS.find((item) => item.key === period);

  return (
    <AdminCard title="Sales overview" eyebrow="Performance">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            Total sales, revenue, and order counts with a quick trend view across {periodMeta?.helper?.toLowerCase()}.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.3rem] border border-black/6 bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Revenue</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-foreground">
                {data ? formatMoneyCompact(data.totals.revenue) : loading ? "…" : "₹0"}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-black/6 bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Orders</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-foreground">
                {data ? data.totals.orders.toLocaleString() : loading ? "…" : "0"}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-black/6 bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Total sales</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-foreground">
                {data ? data.totals.sales.toLocaleString() : loading ? "…" : "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-black/6 bg-background p-2 sm:flex-col sm:items-stretch sm:justify-start">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            <CalendarDays className="h-4 w-4" />
            Range
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={cn(
                  "rounded-[1.1rem] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                  item.key === period
                    ? "bg-[linear-gradient(90deg,_#8b5a2b_0%,_#d4a271_100%)] text-white shadow-[0_10px_22px_rgba(139,90,43,0.25)]"
                    : "bg-white/70 text-foreground hover:bg-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.7rem] border border-black/6 bg-[linear-gradient(180deg,_rgba(178,124,78,0.08)_0%,_rgba(255,255,255,0.7)_100%)] p-5">
        {error ? (
          <p className="text-sm font-medium text-red-500">{error}</p>
        ) : loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="flex min-w-[92px] flex-1 flex-col items-center gap-3">
                <div className="h-40 w-full animate-pulse rounded-[1.2rem] bg-white/70" />
                <div className="h-4 w-14 animate-pulse rounded bg-white/60" />
              </div>
            ))}
          </div>
        ) : data?.series?.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {data.series.map((point) => {
              const height = maxRevenue > 0 ? Math.max((point.revenue / maxRevenue) * 180, 18) : 18;
              return (
                <div key={point.label} className="flex min-w-[92px] flex-1 flex-col items-center gap-3">
                  <div className="relative flex h-48 w-full items-end justify-center rounded-[1.2rem] bg-white/80 px-2 py-3">
                    <div
                      className="w-full rounded-[0.9rem] bg-[linear-gradient(180deg,_#d4a271_0%,_#8b5a2b_100%)] shadow-[0_12px_24px_rgba(139,90,43,0.25)]"
                      style={{ height: `${height}px` }}
                      title={`${point.label}: ₹${point.revenue.toFixed(2)} • ${point.orders} orders • ${point.sales} items`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{point.label}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {formatMoneyCompact(point.revenue)} • {point.orders} ord
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.4rem] bg-white/70 p-5">
            <p className="font-semibold text-foreground">No data yet</p>
            <p className="mt-2 text-sm text-muted">Once orders start coming in, you’ll see revenue and order trends here.</p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
