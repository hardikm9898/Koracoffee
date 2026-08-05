"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getOrders, updateOrderStatus, type AdminOrderRecord } from "@/lib/admin-order-api";

const ORDER_STATUSES = [
  "Received",
  "Roasting",
  "Packaging",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
];

const STATUS_BADGE: Record<string, string> = {
  Received: "bg-sky-100 text-sky-700",
  Roasting: "bg-amber-100 text-amber-800",
  Packaging: "bg-violet-100 text-violet-700",
  Shipped: "bg-emerald-100 text-emerald-700",
  Delivered: "bg-emerald-200 text-emerald-900",
  Cancelled: "bg-rose-100 text-rose-700",
  Refunded: "bg-slate-100 text-slate-800",
};

type OrderUpdateState = {
  status: string;
  cancelReason: string;
  refundReason: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<Record<number, OrderUpdateState>>({});
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        const data = await getOrders();
        if (!ignore) {
          setOrders(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unable to load orders");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders
      .filter((order) => {
        if (statusFilter && order.status !== statusFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const combined = [
          order.orderCode,
          order.shipping.name,
          order.shipping.email,
          order.shipping.phone,
          order.shipping.address,
          order.shipping.city,
          order.shipping.zip,
          order.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return combined.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, statusFilter]);

  const metrics = useMemo(() => {
    if (!orders.length) {
      return [
        { label: "Average order value", value: "₹0.00" },
        { label: "Pending processing", value: "0" },
        { label: "Dispatch rate", value: "0%" },
      ];
    }

    const average = orders.reduce((sum, order) => sum + order.total, 0) / orders.length;
    const pending = orders.filter((order) => order.status !== "Delivered").length;
    const dispatchRate = Math.round(
      (orders.filter((order) => order.status === "Shipped" || order.status === "Delivered").length / orders.length) * 100,
    );

    return [
      { label: "Average order value", value: `₹${average.toFixed(2)}` },
      { label: "Pending processing", value: String(pending) },
      { label: "Dispatch rate", value: `${dispatchRate}%` },
    ];
  }, [orders]);

  const getOrderUpdate = (order: AdminOrderRecord): OrderUpdateState => {
    return orderUpdates[order.id] ?? {
      status: order.status,
      cancelReason: order.cancelReason ?? "",
      refundReason: order.refundReason ?? "",
    };
  };

  const handleChangeStatus = (orderId: number, status: string) => {
    setOrderUpdates((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || { status, cancelReason: "", refundReason: "" }),
        status,
      },
    }));

    if (status === "Cancelled" || status === "Refunded") {
      setExpandedOrderId(orderId);
    }
  };

  const handleUpdateField = (orderId: number, field: keyof OrderUpdateState, value: string) => {
    setOrderUpdates((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || { status: "Received", cancelReason: "", refundReason: "" }),
        [field]: value,
      },
    }));
  };

  const handleSaveStatus = async (order: AdminOrderRecord) => {
    const update = getOrderUpdate(order);
    const isNoChange = update.status === order.status && update.cancelReason === (order.cancelReason ?? "") && update.refundReason === (order.refundReason ?? "");
    const reasonRequired = update.status === "Cancelled" || update.status === "Refunded";
    const reasonValue = update.status === "Cancelled" ? update.cancelReason : update.refundReason;

    if (isNoChange) {
      return;
    }

    if (reasonRequired && !reasonValue.trim()) {
      setError(`Please add a ${update.status === "Cancelled" ? "cancel" : "refund"} reason before saving.`);
      return;
    }

    try {
      setSavingOrderId(order.id);
      setError("");
      const payload: { cancelReason?: string; refundReason?: string } = {};
      if (update.status === "Cancelled") {
        payload.cancelReason = update.cancelReason.trim();
      }
      if (update.status === "Refunded") {
        payload.refundReason = update.refundReason.trim();
      }

      const updated = await updateOrderStatus(order.id, update.status, payload);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setOrderUpdates((current) => ({
        ...current,
        [order.id]: {
          status: updated.status,
          cancelReason: updated.cancelReason ?? "",
          refundReason: updated.refundReason ?? "",
        },
      }));
      setExpandedOrderId(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save order status");
    } finally {
      setSavingOrderId(null);
    }
  };

  // Helper function to calculate refund amount
  const calculateRefundAmount = (order: AdminOrderRecord): { refundAmount: number; breakdown: { itemsSubtotal: number; discountProportional: number; taxProportional: number; shippingProportional: number } } => {
    const itemStatuses = order.itemStatus || [];
    
    // Get cancelled/refunded items
    const cancelledItems = itemStatuses.filter(
      (status) => status.status === "Cancelled" || status.status === "Refunded"
    );

    if (cancelledItems.length === 0) {
      return {
        refundAmount: 0,
        breakdown: { itemsSubtotal: 0, discountProportional: 0, taxProportional: 0, shippingProportional: 0 },
      };
    }

    // Calculate cancelled items subtotal
    let cancelledSubtotal = 0;
    cancelledItems.forEach((status) => {
      const item = order.items.find((i) => i.productId === status.productId);
      if (item) {
        cancelledSubtotal += item.price * item.quantity;
      }
    });

    // Calculate proportional discount
    const discountProportion = cancelledSubtotal / order.subtotal;
    const discountProportional = order.discountAmount ? order.discountAmount * discountProportion : 0;

    // Calculate proportional tax
    const taxProportional = order.tax * discountProportion;

    // Calculate proportional shipping (only if ALL items are cancelled)
    const shippingProportional = cancelledItems.length === order.items.length ? order.shippingFee : 0;

    const refundAmount = cancelledSubtotal - discountProportional + taxProportional + shippingProportional;

    return {
      refundAmount: Math.max(0, refundAmount),
      breakdown: {
        itemsSubtotal: cancelledSubtotal,
        discountProportional,
        taxProportional,
        shippingProportional,
      },
    };
  };

  return (
    <div className="space-y-6 pb-8">
      <AdminTopbar
        title="Order operations"
        description="Review orders, track fulfillment, and update status with reason validation for cancellations and refunds."
        badge="Fulfillment desk"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search order code, customer, phone or address"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="admin-surface rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
            <p className="mt-2 text-sm text-slate-500">Use the table to search, filter, and update order workflow in a single view.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap mt-5">
            <table className="admin-table min-w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Order</th>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Customer</th>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Amount & Products</th>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Status</th>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Placed</th>
                <th className="border-b border-slate-200 px-4 py-3 text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders match the filter. Try a different search or clear the status filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const update = getOrderUpdate(order);
                  const reasonRequired = update.status === "Cancelled" || update.status === "Refunded";
                  const reasonValue = update.status === "Cancelled" ? update.cancelReason : update.refundReason;
                  const hasChanges =
                    update.status !== order.status ||
                    update.cancelReason !== (order.cancelReason ?? "") ||
                    update.refundReason !== (order.refundReason ?? "");
                  const isSaveDisabled = !hasChanges || (reasonRequired && !reasonValue.trim());

                  return (
                    <Fragment key={order.id}>
                      <tr className="align-top">
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-slate-900">{order.orderCode}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">ID {order.id}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-slate-900">{order.shipping.name}</p>
                          <p className="mt-1 text-slate-500">{order.shipping.phone}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-slate-900">₹{order.total.toFixed(2)}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                {item.name}
                              </span>
                            ))}
                            {order.items.length > 2 && (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                +{order.items.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <select
                              value={update.status}
                              onChange={(event) => handleChangeStatus(order.id, event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[order.status] || "bg-black/10 text-slate-900"}`}>
                              {order.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {expandedOrderId === order.id ? "Hide details" : "View details"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveStatus(order)}
                              disabled={isSaveDisabled || savingOrderId === order.id}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {savingOrderId === order.id ? "Saving…" : "Save"}
                            </button>
                          </div>
                          {reasonRequired && !reasonValue.trim() ? (
                            <p className="mt-2 text-xs text-rose-600">Reason required for {update.status.toLowerCase()}.</p>
                          ) : null}
                        </td>
                      </tr>

                      {expandedOrderId === order.id ? (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 px-4 py-5">
                            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                              <div className="space-y-5">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900">Shipping information</h3>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                      <p className="font-medium text-slate-900">Name</p>
                                      <p className="mt-1">{order.shipping.name}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                      <p className="font-medium text-slate-900">Phone</p>
                                      <p className="mt-1">{order.shipping.phone}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 sm:col-span-2">
                                      <p className="font-medium text-slate-900">Address</p>
                                      <p className="mt-1">
                                        {order.shipping.address}
                                        {order.shipping.city ? `, ${order.shipping.city}` : ""}
                                        {order.shipping.state ? `, ${order.shipping.state}` : ""}
                                        {order.shipping.zip ? `, ${order.shipping.zip}` : ""}
                                      </p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                      <p className="font-medium text-slate-900">Email</p>
                                      <p className="mt-1">{order.shipping.email}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                      <p className="font-medium text-slate-900">Payment</p>
                                      <p className="mt-1">{order.paymentMethod || "Card"}</p>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900">Order items</h3>
                                  <div className="admin-table-wrap mt-3">
                                    <table className="admin-table min-w-full text-sm">
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-600">
                                          <th className="border border-slate-200 px-3 py-2 text-left">Item</th>
                                          <th className="border border-slate-200 px-3 py-2">Variant</th>
                                          <th className="border border-slate-200 px-3 py-2">Qty</th>
                                          <th className="border border-slate-200 px-3 py-2">Price</th>
                                          <th className="border border-slate-200 px-3 py-2">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {order.items.map((item, index) => {
                                          const itemStatus = (order.itemStatus || []).find((s) => s.productId === item.productId);
                                          const status = itemStatus?.status || order.status;
                                          const itemTotal = item.price * item.quantity;

                                          return (
                                            <tr key={`${item.productId}-${index}`} className="border-b border-slate-200 last:border-none">
                                              <td className="px-3 py-2 text-slate-900">{item.name}</td>
                                              <td className="px-3 py-2 text-center text-slate-700">{item.variant}</td>
                                              <td className="px-3 py-2 text-center text-slate-700">{item.quantity}</td>
                                              <td className="px-3 py-2 text-right text-slate-900">₹{itemTotal.toFixed(2)}</td>
                                              <td className="px-3 py-2 text-center">
                                                <span
                                                  className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                                                    status === "Delivered"
                                                      ? "bg-emerald-100 text-emerald-700"
                                                      : status === "Cancelled" || status === "Refunded"
                                                        ? "bg-rose-100 text-rose-700"
                                                        : "bg-slate-100 text-slate-700"
                                                  }`}
                                                >
                                                  {status}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-5">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                  <p className="font-medium text-slate-900">Order summary</p>
                                  <div className="mt-3 grid gap-2">
                                    <div className="flex justify-between text-slate-600">
                                      <span>Subtotal</span>
                                      <span>₹{order.subtotal.toFixed(2)}</span>
                                    </div>
                                    {order.discountAmount ? (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>{order.discountLabel || order.couponCode || "Discount"}</span>
                                        <span>-₹{order.discountAmount.toFixed(2)}</span>
                                      </div>
                                    ) : null}
                                    <div className="flex justify-between text-slate-600">
                                      <span>Shipping</span>
                                      <span>₹{order.shippingFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                      <span>Tax</span>
                                      <span>₹{order.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-3 font-semibold text-slate-900">
                                      <div className="flex justify-between">
                                        <span>Total</span>
                                        <span>₹{order.total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {(() => {
                                  const cancelledItems = (order.itemStatus || []).filter((s) => s.status === "Cancelled" || s.status === "Refunded");
                                  if (cancelledItems.length > 0) {
                                    const refundInfo = calculateRefundAmount(order);
                                    return (
                                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                        <p className="font-medium text-rose-900">Refund calculation</p>
                                        <div className="mt-3 grid gap-2 text-xs">
                                          <div className="flex justify-between">
                                            <span>Cancelled items subtotal</span>
                                            <span>₹{refundInfo.breakdown.itemsSubtotal.toFixed(2)}</span>
                                          </div>
                                          {order.discountAmount > 0 && (
                                            <div className="flex justify-between text-emerald-700">
                                              <span>Coupon discount (proportional)</span>
                                              <span>-₹{refundInfo.breakdown.discountProportional.toFixed(2)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between">
                                            <span>Tax (proportional)</span>
                                            <span>+₹{refundInfo.breakdown.taxProportional.toFixed(2)}</span>
                                          </div>
                                          {refundInfo.breakdown.shippingProportional > 0 && (
                                            <div className="flex justify-between">
                                              <span>Shipping (full refund)</span>
                                              <span>+₹{refundInfo.breakdown.shippingProportional.toFixed(2)}</span>
                                            </div>
                                          )}
                                          <div className="border-t border-rose-200 pt-2 font-semibold text-rose-900">
                                            <div className="flex justify-between">
                                              <span>Total refund amount</span>
                                              <span>₹{refundInfo.refundAmount.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {reasonRequired ? (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                    <p className="font-medium text-slate-900">
                                      {update.status === "Cancelled" ? "Cancel reason" : "Refund reason"}
                                    </p>
                                    <textarea
                                      value={reasonValue}
                                      onChange={(event) =>
                                        handleUpdateField(order.id, update.status === "Cancelled" ? "cancelReason" : "refundReason", event.target.value)
                                      }
                                      rows={4}
                                      placeholder={
                                        update.status === "Cancelled"
                                          ? "Enter the reason for cancellation"
                                          : "Enter the reason for refund"
                                      }
                                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                                    />
                                  </div>
                                ) : null}

                                <Link
                                  href={`/orders/${order.id}`}
                                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                >
                                  Open full detail page
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
