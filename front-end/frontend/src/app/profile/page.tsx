"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { User, Package, Ticket, Settings, LogOut, Clock, MapPin, CreditCard, Award, Leaf, Coffee, ChevronDown, CheckCircle2, Truck, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clearSession, getStoredSession, type AuthUser } from "@/lib/auth";
import {
  getCurrentUser,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  type AddressRecord,
} from "@/lib/user-api";
import { getOrders, type OrderItem, type OrderRecord } from "@/lib/order-api";

const ORDERS = [
  {
    id: 89,
    orderCode: "AURA-2024-0089",
    createdAt: "2024-09-20T09:42:00.000Z",
    updatedAt: "2024-09-20T11:30:00.000Z",
    status: "Roasting",
    eta: "Currently in the roaster",
    total: 56,
    subtotal: 48,
    shippingFee: 5,
    tax: 3,
    items: [
      { productId: 1, name: "Midnight Onyx", variant: "Whole Bean / 250g", quantity: 1, price: 28, image: "/products/kenya-aa.png" },
      { productId: 2, name: "Colombian Supremo", variant: "Medium Grind / 250g", quantity: 1, price: 20, image: "/products/kashmiri-saffron.png" },
    ],
    shipping: {
      name: "Aura Member",
      email: "customer@example.com",
      phone: "+91 98765 43210",
      address: "123 Coffee Bean Way",
      city: "Ahmedabad",
      zip: "380001",
    },
  },
  {
    id: 42,
    orderCode: "AURA-2024-0042",
    createdAt: "2024-09-12T10:15:00.000Z",
    updatedAt: "2024-09-15T16:20:00.000Z",
    status: "Delivered",
    eta: "Delivered successfully",
    total: 28,
    subtotal: 23,
    shippingFee: 3,
    tax: 2,
    items: [
      { productId: 3, name: "Ethiopian Yirgacheffe", variant: "Whole Bean / 250g", quantity: 1, price: 23, image: "/products/himalayan-oolong.png" },
    ],
    shipping: {
      name: "Aura Member",
      email: "customer@example.com",
      phone: "+91 98765 43210",
      address: "123 Coffee Bean Way",
      city: "Ahmedabad",
      zip: "380001",
    },
  },
] as unknown as OrderRecord[];

const COUPONS = [
  { code: "AURA20", discount: "20% OFF", expiry: "Valid until Dec 2024", description: "Holiday special valid on all single origin roasts." },
  { code: "FREESHIP", discount: "FREE SHIPPING", expiry: "Valid on next order", description: "Complimentary shipping for our loyal members." },
];

// User's aggregated taste profile stats
const USER_STATS = { acidity: 4, body: 2, sweetness: 5, complexity: 4, finish: 3 };

type NormalizedOrderEntry = {
  id: string;
  status: string;
  date: string;
  total: string;
  eta: string;
  subtotal: string;
  shippingFee: string;
  tax: string;
  paymentMethod: string;
  shippingAddress: string;
  items: Array<{
    name: string;
    variant: string;
    quantity: number;
    price: number;
    image?: string | null;
  }>;
  productCount: number;
  unitCount: number;
  steps: Array<{
    label: string;
    title: string;
    detail: string;
    date: string;
  }>;
  currentStep: number;
};

type OrderEntrySource = Partial<OrderRecord> & {
  items?: Array<Partial<OrderItem>>;
  createdAt?: string;
  date?: string;
  orderCode?: string | number;
  subtotal?: number | string;
  shippingFee?: number | string;
  tax?: number | string;
  eta?: string;
  paymentMethod?: string;
};

const TRACKING_FLOW = ["Received", "Roasting", "Packaging", "Shipped", "Delivered"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const toDisplayDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Update pending";

const toMoney = (value: number | string | undefined, fallback = "₹0.00") => {
  if (typeof value === "number") return formatCurrency(value);
  return value || fallback;
};

const normalizeOrderEntry = (order: OrderEntrySource): NormalizedOrderEntry => {
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        name: item.name ?? "Product",
        variant: item.variant ?? "Standard",
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
        price: typeof item.price === "number" ? item.price : 0,
        image: item.image ?? null,
      }))
    : [];
  const status = order.status ?? "Received";
  const date = typeof order.date === "string" ? order.date : toDisplayDate(order.createdAt);
  const activeStep = TRACKING_FLOW.includes(status) ? TRACKING_FLOW.indexOf(status) : 0;
  const isStopped = status === "Cancelled" || status === "Refunded";
  const currentStep = isStopped ? 0 : activeStep;
  const shipping = order.shipping;
  const shippingAddress = shipping
    ? [shipping.address, shipping.city, shipping.zip].filter(Boolean).join(", ")
    : "Shipping address will appear after checkout";
  const steps = TRACKING_FLOW.map((label, index) => ({
    label,
    title:
      label === "Received"
        ? "Order placed"
        : label === "Roasting"
          ? "Beans in roast queue"
          : label === "Packaging"
            ? "Packed for dispatch"
            : label === "Shipped"
              ? "Handed to courier"
              : "Delivered",
    detail:
      label === "Received"
        ? "We confirmed your order and payment details."
        : label === "Roasting"
          ? "Your coffee is being roasted or prepared in small batches."
          : label === "Packaging"
            ? "Quality check, sealing, and label printing are underway."
            : label === "Shipped"
              ? "Your parcel is moving through the courier network."
              : "The package has reached the delivery address.",
    date:
      index <= currentStep
        ? index === 0
          ? date
          : index === currentStep
            ? toDisplayDate(order.updatedAt || order.createdAt)
            : "Completed"
        : "Pending",
  }));

  return {
    id: String(order.orderCode ?? order.id ?? "order"),
    status,
    date,
    total: toMoney(order.total),
    eta: order.eta || (status === "Delivered" ? "Delivered successfully" : "Preparing your roast"),
    subtotal: toMoney(order.subtotal),
    shippingFee: toMoney(order.shippingFee),
    tax: toMoney(order.tax),
    paymentMethod: order.paymentMethod || "Card",
    shippingAddress,
    items,
    productCount: items.length,
    unitCount: items.reduce((count, item) => count + item.quantity, 0),
    steps,
    currentStep,
  };
};

const UserTasteRadar = () => {
  const getPoint = (val: number, angleIndex: number) => {
    const r = (val / 5) * 40; 
    const angle = -Math.PI / 2 + (angleIndex * 2 * Math.PI / 5);
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  };

  const a = USER_STATS.acidity;
  const s = USER_STATS.sweetness;
  const f = USER_STATS.finish;
  const b = USER_STATS.body;
  const c = USER_STATS.complexity;

  const points = `${getPoint(a, 0)} ${getPoint(s, 1)} ${getPoint(f, 2)} ${getPoint(b, 3)} ${getPoint(c, 4)}`;

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
         {[1, 2, 3, 4, 5].map(level => {
            const webPoints = [0, 1, 2, 3, 4].map(i => getPoint(level, i)).join(" ");
            return <polygon key={level} points={webPoints} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
         })}
         {[0, 1, 2, 3, 4].map(i => (
           <line key={i} x1="50" y1="50" x2={getPoint(5, i).split(',')[0]} y2={getPoint(5, i).split(',')[1]} stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
         ))}

         <motion.polygon 
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          points={points}
          fill="rgba(198, 156, 109, 0.3)" 
          stroke="rgb(198, 156, 109)" 
          strokeWidth="1.5"
          className="origin-center"
        />
      </svg>
      {/* Labels */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[8px] font-bold text-primary tracking-widest uppercase">Acidity</div>
      <div className="absolute top-[30%] -right-4 translate-x-3 text-[8px] font-bold text-primary tracking-widest uppercase">Sweetness</div>
      <div className="absolute bottom-[5%] right-0 translate-x-3 translate-y-3 text-[8px] font-bold text-primary tracking-widest uppercase">Finish</div>
      <div className="absolute bottom-[5%] left-0 -translate-x-3 translate-y-3 text-[8px] font-bold text-primary tracking-widest uppercase">Body</div>
      <div className="absolute top-[30%] -left-4 -translate-x-3 text-[8px] font-bold text-primary tracking-widest uppercase">Complexity</div>
    </div>
  );
};

const OrderTimeline = ({ order }: { order: ReturnType<typeof normalizeOrderEntry> }) => {
  const [expanded, setExpanded] = useState(false);
  const leadItem = order.items[0];
  const imageSrc = leadItem?.image || "/products/kenya-aa.png";
  const statusStyle =
    order.status === "Delivered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : order.status === "Cancelled" || order.status === "Refunded"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      }}
      className="cursor-pointer rounded-[1.75rem] border border-black/6 bg-white/75 p-4 shadow-[0_18px_40px_rgba(28,18,12,0.08)] transition-all hover:border-primary/20 hover:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 sm:p-5"
    >
      <div className="grid gap-5 md:grid-cols-[150px_1fr]">
        <div className="relative h-40 overflow-hidden rounded-[1.35rem] border border-black/6 bg-coffee-light/30 md:h-full md:min-h-[170px]">
          <Image
            src={imageSrc}
            alt={leadItem?.name || "Aura product"}
            fill
            sizes="(max-width: 768px) 100vw, 150px"
            className="object-contain p-4"
          />
          {order.productCount > 1 ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-coffee-dark px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
              +{order.productCount - 1} more
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold tracking-tight text-foreground">{order.id}</span>
                <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", statusStyle)}>
                  {order.status}
                </span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4 opacity-50" />
                <span>{order.date}</span>
                <span className="text-black/20">|</span>
                <span>{order.productCount} products</span>
                <span className="text-black/20">|</span>
                <span>{order.unitCount} units</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">{order.total}</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {expanded ? "Hide tracking" : "View tracking"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-black/6 bg-coffee-light/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{leadItem?.name || "Aura coffee order"}</p>
                <p className="mt-1 text-sm text-muted">{leadItem?.variant || "Freshly packed"} {leadItem ? `x ${leadItem.quantity}` : ""}</p>
              </div>
              <p className="text-sm font-semibold text-primary">{order.eta}</p>
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-black/6 pt-5">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.35rem] border border-black/6 bg-background p-5">
              <p className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                <Truck className="h-4 w-4" /> Tracking details
              </p>
              <div className="space-y-5">
                {order.steps.map((step, index) => {
                  const complete = index <= order.currentStep && !["Cancelled", "Refunded"].includes(order.status);
                  const active = index === order.currentStep && !["Cancelled", "Refunded"].includes(order.status);

                  return (
                    <div key={step.label} className="grid grid-cols-[28px_1fr] gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-white", complete ? "border-primary bg-primary" : "border-black/10 bg-white")}>
                          {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-black/15" />}
                        </span>
                        {index < order.steps.length - 1 ? (
                          <span className={cn("mt-2 h-full min-h-8 w-px", index < order.currentStep ? "bg-primary/40" : "bg-black/10")} />
                        ) : null}
                      </div>
                      <div className="pb-2">
                        <p className={cn("text-sm font-bold", active || complete ? "text-foreground" : "text-muted")}>{step.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{step.detail}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">{step.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.35rem] border border-black/6 bg-background p-5">
                <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  <MapPin className="h-4 w-4" /> Delivery
                </p>
                <p className="text-sm leading-6 text-muted">{order.shippingAddress}</p>
                <p className="mt-3 text-xs font-semibold text-foreground">Payment: {order.paymentMethod}</p>
              </div>

              <div className="rounded-[1.35rem] border border-black/6 bg-background p-5">
                <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  <ReceiptText className="h-4 w-4" /> Price details
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 text-muted"><span>Subtotal</span><span>{order.subtotal}</span></div>
                  <div className="flex justify-between gap-4 text-muted"><span>Shipping</span><span>{order.shippingFee}</span></div>
                  <div className="flex justify-between gap-4 text-muted"><span>Tax</span><span>{order.tax}</span></div>
                  <div className="border-t border-black/6 pt-2 font-bold text-foreground">
                    <div className="flex justify-between gap-4"><span>Total</span><span>{order.total}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-black/6 bg-background p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-primary">Items in this order</p>
            <ul className="grid gap-3 md:grid-cols-2">
              {order.items.map((item, index) => (
                <li key={`${item.name}-${item.variant}-${index}`} className="flex items-center gap-3 rounded-2xl bg-black/5 p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white">
                    <Image
                      src={item.image || "/products/kenya-aa.png"}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted">{item.variant}</p>
                    <p className="mt-1 text-xs text-muted">Qty {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.price)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredSession()?.user ?? null);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [addressForm, setAddressForm] = useState<Partial<AddressRecord>>({
    label: "Home",
    name: "",
    phone: "",
    address: "",
    apartment: "",
    company: "",
    city: "",
    state: "Gujarat",
    country: "India",
    zip: "",
    isDefault: false,
  });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>("");
  const [orders, setOrders] = useState<OrderRecord[]>(ORDERS);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const orderEntries = ordersLoading ? ORDERS : orders;
  const router = useRouter();

  useEffect(() => {
    if (!getStoredSession()?.token) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    let ignore = false;

    const loadUserData = async () => {
      try {
        const profile = await getCurrentUser();
        if (!ignore) {
          setCurrentUser(profile);
          setAddresses(profile.addresses || []);
        }
      } catch (error) {
        console.warn("Unable to load user profile", error);
      }
    };

    void loadUserData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadOrders = async () => {
      try {
        const fetchedOrders = await getOrders();
        if (!ignore) {
          setOrders(fetchedOrders);
        }
      } catch (error) {
        console.warn(error);
      } finally {
        if (!ignore) {
          setOrdersLoading(false);
        }
      }
    };

    void loadOrders();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddressFormUpdate = (field: string, value: string | boolean) => {
    setAddressForm((prev) => ({
      ...prev,
      [field]: field === "isDefault" ? Boolean(value) : String(value),
    }));
    setFormError("");
  };

  const handleEditAddress = (address: AddressRecord) => {
    setEditingAddressId(address.id);
    setAddressForm({ ...address });
    setFormError("");
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      name: "",
      phone: "",
      address: "",
      apartment: "",
      company: "",
      city: "",
      state: "Gujarat",
      country: "India",
      zip: "",
      isDefault: false,
    });
    setFormError("");
  };

  const submitAddressForm = async () => {
    const fields = ["name", "phone", "address", "city", "state", "country", "zip"] as const;
    for (const field of fields) {
      if (!addressForm[field]) {
        setFormError("All address fields are required.");
        return;
      }
    }

    try {
      const payload = {
        label: addressForm.label || "Home",
        name: addressForm.name || "",
        phone: addressForm.phone || "",
        address: addressForm.address || "",
        apartment: addressForm.apartment || "",
        company: addressForm.company || "",
        city: addressForm.city || "",
        state: addressForm.state || "",
        country: addressForm.country || "",
        zip: addressForm.zip || "",
        isDefault: Boolean(addressForm.isDefault),
      };

      const updatedAddresses = editingAddressId
        ? await updateUserAddress(editingAddressId, payload)
        : await addUserAddress(payload);

      setAddresses(updatedAddresses);
      resetAddressForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save address");
    }
  };

  const removeAddress = async (addressId: string) => {
    try {
      const updatedAddresses = await deleteUserAddress(addressId);
      setAddresses(updatedAddresses);
      if (editingAddressId === addressId) {
        resetAddressForm();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete address");
    }
  };

  if (!currentUser) {
    return (
      <div className="page-shell container mx-auto min-h-screen px-6 md:px-12">
        <div className="glass rounded-[2rem] border border-black/5 bg-white/60 p-10 text-center shadow-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Preparing account</p>
          <h1 className="mt-4 font-serif text-3xl font-bold text-foreground">Loading your profile...</h1>
          <p className="mt-3 text-sm text-muted">You will be redirected to login if no session is found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell container mx-auto min-h-screen px-6 md:px-12">
      
      {/* Command Center Top Section (Commented out as requested) */}
      {/*
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[2rem] p-10 lg:col-span-4 flex flex-col items-center justify-center text-center relative overflow-hidden border border-black/5 shadow-xl bg-white/50"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -z-10" />
          <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-primary to-coffee-light p-1.5 flex items-center justify-center relative overflow-hidden shadow-2xl mb-6 rotate-3">
             <div className="absolute inset-0 bg-black/10 rounded-[2.5rem]" />
             <User className="w-12 h-12 text-white relative z-10 -rotate-3" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2 text-foreground">{currentUser.name}</h1>
          <p className="text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-8">
            Verified {currentUser.phoneNumber}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-primary/20 bg-primary/5 text-primary font-bold text-xs tracking-wider shadow-inner">
            <Award className="w-4 h-4" /> Aura Elite Tier
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-[2rem] p-10 lg:col-span-4 flex flex-col items-center justify-center relative border border-black/5 shadow-xl bg-white/50"
        >
          <h3 className="text-xl font-serif font-bold mb-1 w-full text-center text-foreground">Aura Signature</h3>
          <p className="text-[10px] text-muted font-bold tracking-widest uppercase mb-8 w-full text-center">Your evolving taste profile</p>
          <UserTasteRadar />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-[2rem] p-10 lg:col-span-4 flex flex-col justify-center relative overflow-hidden border border-black/5 shadow-xl bg-white/50"
        >
          <h3 className="text-xl font-serif font-bold mb-8 text-foreground">Milestones</h3>
          <div className="space-y-5 w-full">
            <div className="flex items-center gap-5 p-5 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group shadow-sm transition-all hover:bg-primary/10">
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Leaf className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Harvest Tier</h4>
                <p className="text-[10px] text-primary font-bold tracking-widest uppercase">1,240 Ritual Points</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5 p-5 rounded-3xl bg-black/5 border border-black/5 opacity-50 contrast-75 hover:opacity-80 transition-all cursor-not-allowed">
              <div className="w-14 h-14 rounded-2xl bg-black/10 flex items-center justify-center border border-black/10">
                <Coffee className="w-7 h-7 text-muted" />
              </div>
              <div>
                <h4 className="font-bold text-muted">Master Roaster</h4>
                <p className="text-[10px] text-muted font-bold tracking-widest uppercase">760 to next tier</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      */}

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-72 shrink-0"
        >
          <div className="glass rounded-[2rem] p-4 flex flex-col gap-2 border border-black/5 shadow-xl bg-white/50 sticky top-32">
            {[
              { id: "orders", icon: Package, label: "Order History" },
              { id: "coupons", icon: Ticket, label: "Exclusive Offers" },
              { id: "address", icon: MapPin, label: "Vault Addresses" },
              { id: "payment", icon: CreditCard, label: "Secure Payment" },
              { id: "settings", icon: Settings, label: "Account Rituals" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm tracking-wide text-left group",
                  activeTab === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-muted hover:bg-black/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform", activeTab === item.id ? "scale-110" : "group-hover:scale-110")} />
                {item.label}
              </button>
            ))}
            <div className="h-px bg-black/5 my-4 mx-4" />
            <button
              onClick={() => {
                clearSession({ resetGuestSession: true });
                router.push("/login");
              }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 font-bold text-sm tracking-wide hover:bg-red-50 transition-all text-left"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-grow min-w-0"
        >
          {activeTab === "orders" && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold mb-8 text-foreground">Order <span className="gradient-text italic">History</span></h2>
              {orderEntries.length === 0 && !ordersLoading ? (
                <div className="rounded-[2rem] border border-black/6 bg-white/50 p-10 text-center shadow-xl">
                  <p className="text-lg font-semibold text-foreground">No order history yet</p>
                  <p className="mt-3 text-sm text-muted">Place your first order to start tracking roasting progress.</p>
                </div>
              ) : (
                <>
                  {orderEntries.map((rawOrder) => {
                    const order = normalizeOrderEntry(rawOrder);
                    return <OrderTimeline key={order.id} order={order} />;
                  })}
                </>
              )}
            </div>
          )}

          {activeTab === "coupons" && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold mb-8 text-foreground">Aura <span className="gradient-text italic">Benefits</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {COUPONS.map((coupon, i) => (
                  <div key={i} className="glass rounded-[2rem] overflow-hidden relative group border border-black/5 shadow-xl bg-white/50 hover:border-primary/30 transition-all">
                    <div className="absolute top-0 left-0 w-2.5 h-full bg-primary" />
                    <div className="p-10 ml-2">
                      <div className="flex items-start justify-between mb-6">
                        <span className="bg-primary/5 text-primary font-mono font-black text-lg px-4 py-2 rounded-xl border border-primary/20 select-all tracking-wider shadow-inner">
                          {coupon.code}
                        </span>
                        <Ticket className="w-8 h-8 text-primary/40 group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="text-4xl font-black mb-4 text-foreground tracking-tight">{coupon.discount}</h3>
                      <p className="text-sm text-muted mb-8 leading-relaxed font-medium">{coupon.description}</p>
                      
                      <div className="flex flex-col gap-6">
                         <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> {coupon.expiry}
                         </p>
                         <button className="w-full py-4.5 bg-black/5 hover:bg-primary text-foreground hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all duration-300 border border-black/5 hover:border-transparent shadow-sm">
                           Lock In Reward
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "address" && (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif font-bold mb-8 text-foreground">Vault <span className="gradient-text italic">Addresses</span></h2>
              <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  {addresses.length === 0 ? (
                    <div className="rounded-[2rem] border border-black/5 bg-white/50 p-10 shadow-xl">
                      <p className="text-lg font-semibold text-foreground">No saved addresses yet</p>
                      <p className="mt-3 text-sm text-muted">Add a shipping address here and select it later during checkout.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {addresses.map((address) => (
                        <div key={address.id} className="glass rounded-[2rem] border border-black/5 bg-white/50 p-6 shadow-xl">
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <p className="font-semibold text-foreground">{address.label}</p>
                              {address.isDefault && <p className="text-xs uppercase tracking-[0.24em] text-primary">Primary Address</p>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditAddress(address)}
                                className="rounded-2xl border border-black/10 px-4 py-2 text-sm text-foreground transition hover:border-primary"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAddress(address.id)}
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted leading-6">{address.name}</p>
                          <p className="text-sm text-muted leading-6">{address.phone}</p>
                          {address.company && <p className="text-sm text-muted leading-6">{address.company}</p>}
                          <p className="text-sm text-muted leading-6">{address.address}{address.apartment ? `, ${address.apartment}` : ""}</p>
                          <p className="text-sm text-muted leading-6">{address.city}, {address.state}, {address.country} {address.zip}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass rounded-[2rem] border border-black/5 bg-white/50 p-8 shadow-xl">
                  <div className="mb-6">
                    <p className="text-sm uppercase tracking-[0.24em] text-primary">{editingAddressId ? "Edit Address" : "Add Address"}</p>
                    <h3 className="mt-3 text-2xl font-serif font-bold text-foreground">{editingAddressId ? "Update saved address" : "Create new shipping address"}</h3>
                  </div>

                  {formError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Label</span>
                      <input
                        value={addressForm.label || "Home"}
                        onChange={(event) => handleAddressFormUpdate("label", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="Home, Work, Office"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Full Name</span>
                      <input
                        value={addressForm.name || ""}
                        onChange={(event) => handleAddressFormUpdate("name", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="John Doe"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Phone</span>
                      <input
                        value={addressForm.phone || ""}
                        onChange={(event) => handleAddressFormUpdate("phone", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="9999999999"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Street Address</span>
                      <input
                        value={addressForm.address || ""}
                        onChange={(event) => handleAddressFormUpdate("address", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="123 Coffee Bean Way"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Apt, Suite, etc. (optional)</span>
                      <input
                        value={addressForm.apartment || ""}
                        onChange={(event) => handleAddressFormUpdate("apartment", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="Apartment, suite, unit, building"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Company (optional)</span>
                      <input
                        value={addressForm.company || ""}
                        onChange={(event) => handleAddressFormUpdate("company", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                        placeholder="Aura Coffee HQ"
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">City</span>
                        <input
                          value={addressForm.city || ""}
                          onChange={(event) => handleAddressFormUpdate("city", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                          placeholder="Seattle"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">State</span>
                        <input
                          value={addressForm.state || ""}
                          onChange={(event) => handleAddressFormUpdate("state", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                          placeholder="Washington"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Country</span>
                        <input
                          value={addressForm.country || ""}
                          onChange={(event) => handleAddressFormUpdate("country", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                          placeholder="India"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Zip Code</span>
                        <input
                          value={addressForm.zip || ""}
                          onChange={(event) => handleAddressFormUpdate("zip", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none"
                          placeholder="98101"
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-3 text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={Boolean(addressForm.isDefault)}
                          onChange={(event) => handleAddressFormUpdate("isDefault", event.target.checked)}
                          className="h-4 w-4 rounded border border-black/10 text-primary focus:ring-primary"
                        />
                        Set as default shipping address
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {editingAddressId && (
                          <button
                            type="button"
                            onClick={resetAddressForm}
                            className="rounded-2xl border border-black/10 bg-white/90 px-5 py-3 text-sm font-bold text-foreground hover:border-primary"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={submitAddressForm}
                          className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-foreground"
                        >
                          {editingAddressId ? "Save changes" : "Save address"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab !== "orders" && activeTab !== "coupons" && activeTab !== "address") && (
            <div className="glass p-20 rounded-[2.5rem] flex flex-col items-center justify-center text-center border border-black/5 shadow-xl bg-white/50 h-[400px]">
              <Settings className="w-16 h-16 text-primary/20 mb-8 animate-spin-slow" style={{ animationDuration: '12s' }} />
              <h3 className="text-2xl font-serif font-bold mb-3 text-foreground">Syncing Module...</h3>
              <p className="text-muted text-sm max-w-xs mx-auto leading-relaxed">We&apos;re updating your secure vault. This section will be accessible shortly.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
