"use client";

import { useEffect, useState } from "react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import SalesOverviewCard from "@/components/admin/SalesOverviewCard";
import RecentActivitiesCard from "@/components/admin/RecentActivitiesCard";
import {
  getAdminOverviewStats,
  getRevenueSeriesData,
  getChannelPerformanceData,
  getFulfillmentQueueData,
  teamTasks,
  activityFeed,
  customerSegments,
  type AdminOverviewStat,
  type AdminRevenueSeriesItem,
  type AdminChannelPerformance,
  type AdminFulfillmentQueueItem,
} from "@/lib/admin-data";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  PackageCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

const iconMap = {
  CreditCard,
  ShoppingBag,
  Users,
  PackageCheck,
};

export default function OverviewPage() {
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStat[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<AdminRevenueSeriesItem[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<AdminChannelPerformance[]>([]);
  const [fulfillmentQueue, setFulfillmentQueue] = useState<AdminFulfillmentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [stats, series, channels, queue] = await Promise.all([
          getAdminOverviewStats(),
          getRevenueSeriesData(),
          getChannelPerformanceData(),
          getFulfillmentQueueData(),
        ]);

        setOverviewStats(stats);
        setRevenueSeries(series);
        setChannelPerformance(channels);
        setFulfillmentQueue(queue);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const peakRevenue = revenueSeries.length > 0 ? Math.max(...revenueSeries.map((item) => item.amount)) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Store performance at a glance"
          description="Track revenue, fulfillment velocity, retention, and execution risk from a dedicated admin frontend."
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminTopbar
          title="Store performance at a glance"
          description="Track revenue, fulfillment velocity, retention, and execution risk from a dedicated admin frontend."
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-500">
              <p className="font-medium">Error loading dashboard</p>
              <p className="text-sm text-muted mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Store performance at a glance"
        description="Track revenue, fulfillment velocity, retention, and execution risk from a dedicated admin frontend."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => {
          const IconComponent = iconMap[stat.title.includes("revenue") ? "CreditCard" :
                                   stat.title.includes("Orders") ? "ShoppingBag" :
                                   stat.title.includes("customers") ? "Users" : "PackageCheck"];

          return (
            <AdminCard key={stat.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">{stat.title}</p>
                  <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{stat.value}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                        stat.tone === "positive" ? "bg-emerald-100 text-emerald-700" :
                        stat.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                      )}
                    >
                      {stat.delta}
                    </span>
                    <span className="text-xs text-muted">{stat.detail}</span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <IconComponent className="h-6 w-6" />
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <SalesOverviewCard />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <AdminCard title="Revenue pulse" eyebrow="7 day trend">
          <div className="flex items-end gap-3 rounded-[1.6rem] bg-[linear-gradient(180deg,_rgba(178,124,78,0.08)_0%,_rgba(255,255,255,0.7)_100%)] p-5">
            {revenueSeries.map((item) => {
              const height = `${Math.max((item.amount / peakRevenue) * 220, 26)}px`;
              return (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="relative flex h-60 w-full items-end justify-center rounded-[1.2rem] bg-white/80 px-2 py-3">
                    <div
                      className="w-full rounded-[0.9rem] bg-[linear-gradient(180deg,_#d4a271_0%,_#8b5a2b_100%)] shadow-[0_12px_24px_rgba(139,90,43,0.25)]"
                      style={{ height }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted">${Math.round(item.amount / 1000)}k</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard title="Channel mix" eyebrow="Acquisition">
          <div className="space-y-4">
            {channelPerformance.map((channel) => (
              <div key={channel.name} className="rounded-[1.3rem] border border-black/6 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{channel.name}</p>
                    <p className="text-sm text-muted">{channel.revenue} revenue</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{channel.share}%</p>
                    <p className="text-xs text-emerald-700">{channel.trend}</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-black/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,_#8b5a2b_0%,_#d4a271_100%)]"
                    style={{ width: `${channel.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AdminCard title="Fulfillment queue" eyebrow="Operations">
          <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
            <div className="admin-table-wrap">
            <table className="admin-table min-w-full divide-y divide-black/6 text-left">
              <thead className="bg-background">
                <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Total</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 bg-white">
                {fulfillmentQueue.map((order) => (
                  <tr key={order.code}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-foreground">{order.code}</p>
                      <p className="text-sm text-muted">{order.items}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{order.customer}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-foreground">{order.total}</td>
                    <td className="px-4 py-4">
                      <p
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                          order.status === "Ready" && "bg-emerald-100 text-emerald-700",
                          order.status === "Attention" && "bg-rose-100 text-rose-700",
                          order.status === "Packing" && "bg-amber-100 text-amber-700",
                          order.status === "Label created" && "bg-sky-100 text-sky-700",
                        )}
                      >
                        {order.status}
                      </p>
                      <p className="mt-2 text-xs text-muted">{order.eta}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="Priority tasks" eyebrow="Today">
            <div className="space-y-3">
              {teamTasks.map((task) => (
                <div key={task.title} className="rounded-[1.3rem] border border-black/6 bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-sm text-muted">{task.owner} • Due {task.due}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                        task.priority === "High" && "bg-rose-100 text-rose-700",
                        task.priority === "Medium" && "bg-amber-100 text-amber-700",
                        task.priority === "Low" && "bg-slate-100 text-slate-700",
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Segment notes" eyebrow="Customers">
            <div className="space-y-3">
              {customerSegments.map((segment) => (
                <div key={segment.name} className="rounded-[1.3rem] border border-black/6 bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{segment.name}</p>
                    <span className="text-sm font-bold text-primary">{segment.size}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{segment.note}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {segment.spend} • Loyalty {segment.loyalty}
                  </p>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>

      <RecentActivitiesCard />

      <AdminCard title="Activity feed" eyebrow="Recent signals">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {activityFeed.map((item) => (
            <div key={item.title} className="rounded-[1.4rem] border border-black/6 bg-background p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{item.time}</p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
