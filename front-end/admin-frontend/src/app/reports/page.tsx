"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  getProfitabilityReport,
  getProductCostReport,
  getPurchaseReport,
  type ProfitabilityReport,
  type ProductCostRow,
  type PurchaseReport,
} from "@/lib/admin-report-api";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [profitability, setProfitability] = useState<ProfitabilityReport | null>(null);
  const [productCosts, setProductCosts] = useState<ProductCostRow[]>([]);
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
      const [profitRes, costRes, purchaseRes] = await Promise.all([
        getProfitabilityReport(filters),
        getProductCostReport(),
        getPurchaseReport(filters),
      ]);
      setProfitability(profitRes);
      setProductCosts(costRes);
      setPurchaseReport(purchaseRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Reports"
        description="Profitability, product cost, and purchasing — computed from real revenue, real ledger COGS, and logged expenses, not estimates layered on top of each other."
        badge="Finance"
      />

      <AdminCard title="Period" eyebrow="Filter">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Apply
          </button>
        </div>
      </AdminCard>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {profitability ? (
        <AdminCard title="Profitability" eyebrow={`${profitability.orderCount} orders`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-sm text-muted">Net sales</p>
              <p className="mt-2 text-2xl font-bold text-foreground">${profitability.netSales.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">COGS</p>
              <p className="mt-2 text-2xl font-bold text-foreground">${profitability.cogs.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Operating expenses</p>
              <p className="mt-2 text-2xl font-bold text-foreground">${profitability.operatingExpenses.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Net profit</p>
              <p className={`mt-2 text-2xl font-bold ${profitability.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                ${profitability.netProfit.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 rounded-2xl border border-black/6 bg-background p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Gross sales</p>
              <p className="mt-1 font-semibold text-foreground">${profitability.grossSales.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Discounts</p>
              <p className="mt-1 font-semibold text-foreground">-${profitability.discounts.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Shipping revenue</p>
              <p className="mt-1 font-semibold text-foreground">+${profitability.shippingRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Gross profit</p>
              <p className="mt-1 font-semibold text-foreground">${profitability.grossProfit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Margin</p>
              <p className="mt-1 font-semibold text-foreground">{profitability.marginPercent.toFixed(1)}%</p>
            </div>
          </div>
          {Object.keys(profitability.cogsByType).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
              COGS by type:
              {Object.entries(profitability.cogsByType).map(([type, value]) => (
                <span key={type} className="rounded-full border border-black/8 px-3 py-1">
                  {type}: ${value.toFixed(2)}
                </span>
              ))}
            </div>
          ) : null}
        </AdminCard>
      ) : null}

      <AdminCard title="Product cost" eyebrow="Per-unit, from active recipes">
        <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full divide-y divide-black/6 text-left">
              <thead className="bg-background">
                <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 font-bold">Selling price</th>
                  <th className="px-4 py-3 font-bold">Raw cost</th>
                  <th className="px-4 py-3 font-bold">Packaging cost</th>
                  <th className="px-4 py-3 font-bold">Total COGS</th>
                  <th className="px-4 py-3 font-bold">Gross profit</th>
                  <th className="px-4 py-3 font-bold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 bg-white">
                {productCosts.map((row) => (
                  <tr key={`${row.productId}-${row.variant}`}>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {row.productName}
                      <p className="text-xs text-muted">{row.variant}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">${row.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted">${row.rawMaterialCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted">${row.packagingCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">${row.totalCogs.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${row.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      ${row.grossProfit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{row.marginPercent.toFixed(1)}%</td>
                  </tr>
                ))}
                {productCosts.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                      No products have an active recipe yet — add one on the{" "}
                      <Link href="/recipes" className="text-primary hover:underline">
                        Recipes
                      </Link>{" "}
                      page to see cost estimates here.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      {purchaseReport ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <AdminCard title="Purchases by supplier" eyebrow={`Total: $${purchaseReport.totalValue.toFixed(2)}`}>
            <div className="space-y-2">
              {purchaseReport.bySupplier.map((row) => (
                <div key={row.supplierId ?? row.supplierName} className="flex items-center justify-between rounded-2xl border border-black/6 bg-background px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{row.supplierName}</p>
                    <p className="text-xs text-muted">{row.purchaseCount} purchase orders</p>
                  </div>
                  <p className="font-semibold text-foreground">${row.totalValue.toFixed(2)}</p>
                </div>
              ))}
              {purchaseReport.bySupplier.length === 0 && !loading ? (
                <p className="text-sm text-muted">No confirmed purchases in this period.</p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard title="Purchases by item" eyebrow="Quantity received">
            <div className="space-y-2">
              {purchaseReport.byItem.map((row) => (
                <div key={row.itemId ?? row.itemName} className="flex items-center justify-between rounded-2xl border border-black/6 bg-background px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{row.itemName}</p>
                    <p className="text-xs text-muted">{row.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${row.totalValue.toFixed(2)}</p>
                    <p className="text-xs text-muted">{row.totalQuantity} units</p>
                  </div>
                </div>
              ))}
              {purchaseReport.byItem.length === 0 && !loading ? (
                <p className="text-sm text-muted">No confirmed purchases in this period.</p>
              ) : null}
            </div>
          </AdminCard>
        </div>
      ) : null}

      <AdminCard title="More detail" eyebrow="Ledger-backed">
        <p className="text-sm text-muted">
          Consumption, wastage, and every other stock movement are already fully filterable on the{" "}
          <Link href="/inventory/ledger" className="text-primary hover:underline">
            Stock ledger
          </Link>{" "}
          page (filter by type: consumption, damage, wastage, purchase) rather than duplicated here.
        </p>
      </AdminCard>
    </div>
  );
}
