import Link from "next/link";
import { AdminOrderItem, getOrderById } from "@/lib/admin-order-api";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getOrderById(Number(orderId));

  return (
    <main className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">Order detail</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">{order.orderCode}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Full order record with shipping, payment, and item breakdown in a clean admin view.</p>
        </div>
        <Link
          href="/orders"
          className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          Back to orders
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Shipping information</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Recipient</p>
                  <p className="mt-1">{order.shipping.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Phone</p>
                  <p className="mt-1">{order.shipping.phone}</p>
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Address</p>
                  <p className="mt-1">
                    {order.shipping.address}
                    {order.shipping.apartment ? `, ${order.shipping.apartment}` : ""}
                    {order.shipping.company ? `, ${order.shipping.company}` : ""}
                    {order.shipping.city ? `, ${order.shipping.city}` : ""}
                    {order.shipping.state ? `, ${order.shipping.state}` : ""}
                    {order.shipping.zip ? `, ${order.shipping.zip}` : ""}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Email</p>
                  <p className="mt-1">{order.shipping.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Payment method</p>
                  <p className="mt-1">{order.paymentMethod || "Card"}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Order notes</p>
              <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {order.notes || "No special notes provided."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Order status</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{order.status}</p>
              <p className="mt-1 text-sm text-slate-500">{order.eta}</p>
            </div>
            {order.cancelReason ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="font-medium text-rose-900">Cancel reason</p>
                <p className="mt-2">{order.cancelReason}</p>
              </div>
            ) : null}
            {order.refundReason ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Refund reason</p>
                <p className="mt-2">{order.refundReason}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Timeline</p>
              <p className="mt-2">Placed {new Date(order.createdAt).toLocaleString()}</p>
              <p className="mt-1">Updated {new Date(order.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-900">Order summary</p>
          <p className="text-sm text-slate-500">{order.items.length} line items</p>
        </div>
        <div className="admin-table-wrap mt-4">
          <table className="admin-table min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-3 py-2">Item</th>
                <th className="border border-slate-200 px-3 py-2">Variant</th>
                <th className="border border-slate-200 px-3 py-2">Qty</th>
                <th className="border border-slate-200 px-3 py-2">Price</th>
                <th className="border border-slate-200 px-3 py-2">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: AdminOrderItem, index: number) => (
                <tr key={`${item.productId}-${index}`} className="border-b border-slate-200 last:border-none">
                  <td className="px-3 py-2 text-slate-900">{item.name}</td>
                  <td className="px-3 py-2 text-slate-700">{item.variant}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-700">₹{item.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Subtotal</p>
            <p className="mt-2">₹{order.subtotal.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Shipping</p>
            <p className="mt-2">₹{order.shippingFee.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Tax</p>
            <p className="mt-2">₹{order.tax.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Total</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">₹{order.total.toFixed(2)}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
