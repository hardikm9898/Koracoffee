"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getPackingSlip, type PackingSlip } from "@/lib/admin-order-api";

export default function PackingSlipPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [slip, setSlip] = useState<PackingSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setSlip(await getPackingSlip(Number(orderId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load packing slip.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading packing slip…</p>;
  }

  if (error || !slip) {
    return <p className="p-6 text-sm text-rose-700">{error || "Packing slip not found."}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/orders/${slip.orderId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="rounded-[1.5rem] border border-black/10 bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-black/10 pb-6">
          <div className="flex items-center gap-3">
            <Image src="/logo/koura-mark.png" alt="Koura Coffee" width={116} height={110} className="h-12 w-auto object-contain" />
            <div>
              <p className="text-lg font-black tracking-[0.04em] text-foreground">KOURA COFFEE</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Packing slip</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-foreground">{slip.orderCode}</p>
            <p className="text-muted">{new Date(slip.createdAt).toLocaleDateString()}</p>
            <p className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {slip.status}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Ship to</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{slip.shipping.name}</p>
            <p className="text-sm text-muted">
              {slip.shipping.address}
              {slip.shipping.apartment ? `, ${slip.shipping.apartment}` : ""}
            </p>
            <p className="text-sm text-muted">
              {slip.shipping.city}, {slip.shipping.state} {slip.shipping.zip}
            </p>
            <p className="text-sm text-muted">{slip.shipping.country}</p>
            <p className="mt-1 text-sm text-muted">{slip.shipping.phone}</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Items</p>
          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-muted">
                <th className="py-2">Product</th>
                <th className="py-2">Variant</th>
                <th className="py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {slip.items.map((item) => (
                <tr key={`${item.productId}-${item.variant}`} className="border-b border-black/6">
                  <td className="py-3 font-medium text-foreground">{item.name}</td>
                  <td className="py-3 text-muted">{item.variant}</td>
                  <td className="py-3 text-right font-semibold text-foreground">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Packing checklist</p>
          <p className="mt-1 text-xs text-muted">Verify every item below is included before sealing the box.</p>
          <div className="mt-3 space-y-2">
            {slip.items.flatMap((item) =>
              item.packagingChecklist.map((component, index) => (
                <label key={`${item.productId}-${component.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-black/8 px-4 py-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-black/20" />
                  <span className="text-foreground">
                    {component.name} — {component.quantity} {component.unit}
                  </span>
                  <span className="ml-auto text-xs text-muted">for {item.name}</span>
                </label>
              )),
            )}
            {slip.items.every((item) => item.packagingChecklist.length === 0) ? (
              <p className="text-sm text-muted">No packaging checklist defined for these items — see Recipes to add one.</p>
            ) : null}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted">Thank you for your order — Koura Coffee</p>
      </div>
    </div>
  );
}
