"use client";

import { useEffect, useMemo, useState } from "react";
import AdminCard from "@/components/admin/AdminCard";
import { getRecentActivitiesData, type AdminRecentActivityItem, type AdminRecentActivityType } from "@/lib/admin-data";
import { cn } from "@/lib/utils";
import { AlertTriangle, PackageCheck, ShoppingBag, UserPlus } from "lucide-react";

const iconForType = (type: AdminRecentActivityType) => {
  switch (type) {
    case "order":
      return ShoppingBag;
    case "customer":
      return UserPlus;
    case "stock":
      return PackageCheck;
    default:
      return AlertTriangle;
  }
};

const typeLabel: Record<AdminRecentActivityType, string> = {
  order: "Order",
  customer: "Customer",
  stock: "Stock",
};

const FILTERS: { key: "all" | AdminRecentActivityType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "customer", label: "Customers" },
  { key: "stock", label: "Low stock" },
];

export default function RecentActivitiesCard() {
  const [items, setItems] = useState<AdminRecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getRecentActivitiesData(12)
      .then((payload) => {
        if (!alive) return;
        setItems(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load recent activities");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  return (
    <AdminCard title="Recent activities" eyebrow="Logs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Recent orders, new customer registrations, and low stock alerts.</p>
        <div className="grid grid-cols-4 gap-2 rounded-[1.35rem] border border-black/6 bg-background p-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-[1.05rem] px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition",
                filter === item.key ? "bg-primary/12 text-primary" : "bg-white/60 text-foreground hover:bg-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <p className="text-sm font-medium text-red-500">{error}</p>
        ) : loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-[1.4rem] border border-black/6 bg-background" />
            ))}
          </div>
        ) : filteredItems.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredItems.map((activity, idx) => {
              const Icon = iconForType(activity.type);
              return (
                <div
                  key={`${activity.type}-${idx}-${activity.time}`}
                  className="rounded-[1.4rem] border border-black/6 bg-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{activity.title}</p>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                          {typeLabel[activity.type]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">{activity.detail}</p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">{activity.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-black/6 bg-background p-5">
            <p className="font-semibold text-foreground">No activity yet</p>
            <p className="mt-2 text-sm text-muted">As orders and customers come in, events will show up here.</p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}

