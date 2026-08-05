"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Coffee, ShieldCheck, CreditCard, ChevronRight, CheckCircle2, ArrowLeft, Package, MapPin, Search } from "lucide-react";
import { useAppContext } from "@/context/CartContext";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createOrder } from "@/lib/order-api";
import { getStoredSession } from "@/lib/auth";
import { addUserAddress, getUserAddresses, updateUserAddress, type AddressRecord } from "@/lib/user-api";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";

const STEPS = ["Shipping", "Payment", "Review"];

const AVAILABLE_COUPONS: Record<string, { label: string; type: "percent" | "shipping" | "flat"; value: number }> = {
  AURA20: { label: "20% OFF", type: "percent", value: 0.2 },
  FREESHIP: { label: "FREE SHIPPING", type: "shipping", value: 1 },
  WELCOME50: { label: "₹50 OFF", type: "flat", value: 50 },
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, isCartReady, clearCart } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { width, height } = useWindowSize();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    company: "",
    city: "",
    state: "",
    country: "",
    zip: "",
    cardName: ""
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; label: string; discount: number } | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [addressActionLoading, setAddressActionLoading] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (field: string, value: string) => {
    switch (field) {
      case 'zip': return /^[1-9]\d{5}$/.test(value.trim());
      case 'firstName':
      case 'lastName':
      case 'address':
      case 'city':
      case 'state':
      case 'country':
      case 'cardName':
         return value.trim().length > 1;
      default: return true;
    }
  };

  const getValidationClass = (field: string) => {
    if (!touched[field]) return "border-black/10 focus:border-primary focus:shadow-[0_0_15px_rgba(198,156,109,0.1)] bg-white/50";
    const isValid = validate(field, formData[field as keyof typeof formData]);
    if (isValid) return "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] text-foreground bg-green-50/10";
    return "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)] text-red-600 bg-red-50/10";
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setSelectedAddressId(null);
    setEditingAddressId(null);
    setAddressMessage("");
  };

  const applyAddressToForm = useCallback((address: AddressRecord) => {
    const [firstName, ...rest] = address.name.split(" ");

    setFormData((prev) => ({
      ...prev,
      firstName: firstName || "",
      lastName: rest.join(" ") || "",
      address: address.address,
      apartment: address.apartment || "",
      company: address.company || "",
      city: address.city,
      state: address.state,
      country: address.country,
      zip: address.zip,
    }));
    setAddressLabel(address.label || "Home");
    setSaveAsDefault(Boolean(address.isDefault));
  }, []);

  const getCouponDefinition = (code: string) => {
    return AVAILABLE_COUPONS[String(code || "").trim().toUpperCase()] || null;
  };

  const calculateCouponDiscount = (coupon: { type: string; value: number } | null) => {
    if (!coupon) return 0;

    const shipping = 5.0;
    const tax = cartTotal * 0.08;
    const orderAmount = cartTotal + shipping + tax;

    if (coupon.type === "percent") {
      return Math.round(orderAmount * coupon.value * 100) / 100;
    }

    if (coupon.type === "shipping") {
      return shipping;
    }

    if (coupon.type === "flat") {
      return Math.min(coupon.value, orderAmount);
    }

    return 0;
  };

  const applyCoupon = () => {
    const coupon = getCouponDefinition(couponCode);
    if (!coupon) {
      setAppliedCoupon(null);
      setCouponMessage("Coupon code is invalid or expired.");
      return;
    }

    const discount = calculateCouponDiscount(coupon);
    setAppliedCoupon({ code: couponCode.toUpperCase().trim(), label: coupon.label, discount });
    setCouponMessage(`Coupon applied: ${coupon.label}`);
  };

  const loadSavedAddresses = useCallback(async () => {
    try {
      const savedAddresses = await getUserAddresses();
      setAddresses(savedAddresses);
      if (savedAddresses.length > 0) {
        const defaultAddress = savedAddresses.find((entry) => entry.isDefault) || savedAddresses[0];
        setSelectedAddressId(defaultAddress.id);
        setEditingAddressId(null);
        setShowAddressForm(false);
        applyAddressToForm(defaultAddress);
      } else {
        setSelectedAddressId(null);
        setEditingAddressId(null);
        setShowAddressForm(false);
        setAddressLabel("Home");
        setSaveAsDefault(true);
      }
    } catch (error) {
      console.warn("Unable to load saved addresses", error);
    }
  }, [applyAddressToForm]);

  const handleAddressSelect = (addressId: string) => {
    const selected = addresses.find((address) => address.id === addressId);
    if (!selected) return;
    setSelectedAddressId(addressId);
    setEditingAddressId(null);
    setShowAddressForm(false);
    applyAddressToForm(selected);
    setAddressMessage("");
  };

  const handleStartNewAddress = () => {
    setSelectedAddressId(null);
    setEditingAddressId(null);
    setShowAddressForm(true);
    setAddressLabel(addresses.length === 0 ? "Home" : "New Address");
    setSaveAsDefault(addresses.length === 0);
    setAddressMessage("");
    setTouched({});
    setFormData((prev) => ({
      ...prev,
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      company: "",
      city: "",
      state: "",
      country: "",
      zip: "",
    }));
  };

  const handleEditSavedAddress = (address: AddressRecord) => {
    setSelectedAddressId(address.id);
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    applyAddressToForm(address);
    setAddressMessage("");
    setTouched({});
  };

  const validateShippingStep = () => {
    const requiredFields = ["firstName", "lastName", "address", "city", "state", "country", "zip"] as const;
    const nextTouched = requiredFields.reduce<Record<string, boolean>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});

    setTouched((prev) => ({ ...prev, ...nextTouched }));
    return requiredFields.every((field) => validate(field, formData[field]));
  };

  const handleSaveAddress = async () => {
    if (!isAuthenticated) return;
    if (!validateShippingStep()) {
      setAddressMessage("Please fill all required delivery details before saving the address.");
      return;
    }

    setAddressActionLoading(true);
    setAddressMessage("");

    const payload = {
      label: addressLabel.trim() || "Address",
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      phone: getStoredSession()?.user?.phoneNumber || "",
      address: formData.address.trim(),
      apartment: formData.apartment.trim(),
      company: formData.company.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      zip: formData.zip.trim(),
      isDefault: saveAsDefault,
    };

    try {
      if (editingAddressId) {
        const updatedAddresses = await updateUserAddress(editingAddressId, payload);
        setAddresses(updatedAddresses);
        setAddressMessage("Address updated successfully.");
        const selectedAddress =
          updatedAddresses.find((address) => address.id === editingAddressId) ||
          updatedAddresses.find((address) => address.isDefault) ||
          updatedAddresses[0];

        if (selectedAddress) {
          setSelectedAddressId(selectedAddress.id);
          applyAddressToForm(selectedAddress);
        }
      } else {
        const updatedAddresses = await addUserAddress(payload);
        setAddresses(updatedAddresses);
        setAddressMessage("Address saved successfully.");
        const selectedAddress =
          updatedAddresses.find(
            (address) =>
              address.name === payload.name &&
              address.address === payload.address &&
              address.zip === payload.zip,
          ) ||
          updatedAddresses.find((address) => address.isDefault) ||
          updatedAddresses[updatedAddresses.length - 1];

        if (selectedAddress) {
          setSelectedAddressId(selectedAddress.id);
          applyAddressToForm(selectedAddress);
        }
      }

      setEditingAddressId(null);
      setShowAddressForm(false);
      await loadSavedAddresses();
    } catch (error) {
      console.warn("Unable to save address", error);
      setAddressMessage("Unable to save address right now. Please try again.");
    } finally {
      setAddressActionLoading(false);
    }
  };

  const fetchAndSyncAuthentication = useCallback(async () => {
    const session = getStoredSession();
    const authenticated = Boolean(session?.token);
    setIsAuthenticated(authenticated);
    if (authenticated) {
      await loadSavedAddresses();
    } else {
      setAddresses([]);
      setSelectedAddressId(null);
      setEditingAddressId(null);
      setShowAddressForm(true);
    }
  }, [loadSavedAddresses]);

  useEffect(() => {
    const initialize = async () => {
      await fetchAndSyncAuthentication();
      if (!getStoredSession()?.token) {
        router.replace(`/login?returnTo=${encodeURIComponent("/checkout")}`);
      }
    };

    void initialize();

    const onAuthChange = async () => {
      await fetchAndSyncAuthentication();
      if (!getStoredSession()?.token) {
        router.replace(`/login?returnTo=${encodeURIComponent("/checkout")}`);
      }
    };

    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, [fetchAndSyncAuthentication, router]);

  const handleNext = () => {
    if (currentStep === 0 && !validateShippingStep()) {
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      processOrder();
    }
  };

  const processOrder = () => {
    setIsProcessing(true);

    const shipping = 5.0;
    const tax = Math.round(cartTotal * 0.08 * 100) / 100;
    const couponDiscount = appliedCoupon?.discount ?? 0;
    const finalTotal = Math.max(0, cartTotal + shipping + tax - couponDiscount);

    const saveOrder = async () => {
      try {
        const storedSession = getStoredSession();

        await createOrder({
          items: cart.map((item) => ({
            productId: item.id,
            name: item.name,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          })),
          shipping: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: "customer@aura.coffee",
            phone: storedSession?.user?.phoneNumber || "9999999999",
            address: formData.address,
            apartment: formData.apartment || "",
            company: formData.company || "",
            city: formData.city,
            state: formData.state,
            country: formData.country,
            zip: formData.zip,
          },
          couponCode: appliedCoupon?.code,
          subtotal: cartTotal,
          shippingFee: shipping,
          tax,
          total: finalTotal,
        });

        clearCart();
        setIsSuccess(true);
      } catch (error) {
        console.warn("Unable to save order to backend", error);
      } finally {
        setIsProcessing(false);
      }
    };

    void saveOrder();
  };

  if (!isCartReady && !isSuccess) {
    return (
      <div className="pt-28 pb-24 px-6 container mx-auto min-h-screen flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-8" />
        <h2 className="text-3xl font-serif font-bold mb-4 text-foreground">Loading checkout</h2>
        <p className="text-muted max-w-md">Waiting for your saved cart items before checkout.</p>
      </div>
    );
  }

  if (cart.length === 0 && !isSuccess) {
    return (
      <div className="pt-28 pb-24 px-6 container mx-auto min-h-screen flex flex-col items-center justify-center text-center">
        <Package className="w-20 h-20 text-primary mb-8 animate-bounce opacity-40" />
        <h2 className="text-3xl font-serif font-bold mb-4 text-foreground">Your Basket is Light</h2>
        <p className="text-muted mb-10 text-lg max-w-md">You haven&apos;t added any artisan roasts to your cart yet. Let&apos;s find something perfect for you.</p>
        <Link href="/shop" className="bg-primary text-white px-10 py-4 rounded-2xl font-bold hover:bg-foreground transition-all shadow-[0_20px_40px_rgba(198,156,109,0.2)]">
          Explore Our Collection
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="pt-24 pb-24 px-6 container mx-auto min-h-screen flex flex-col items-center justify-center text-center relative">
        {isSuccess && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} colors={['#C69C6D', '#2A1C16', '#F5EBE1']} />}
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 relative border border-primary/20 shadow-2xl"
        >
          <div className="absolute inset-0 rounded-[2rem] border border-primary animate-ping opacity-20" />
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 text-foreground"
        >
          Order <span className="gradient-text italic">Confirmed</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted text-lg max-w-md mx-auto mb-12 leading-relaxed"
        >
          Thank you for exploring the future of flavor with us. Your freshly roasted beans are being prepared for dispatch.
        </motion.p>
        
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6 }}
           className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
        >
          <Link href="/profile" className="bg-black/5 text-foreground border border-black/10 px-10 py-4 rounded-2xl font-bold hover:bg-black/10 transition-all w-full sm:w-auto">
            View Order Status
          </Link>
          <Link href="/shop" className="bg-primary text-white px-10 py-4 rounded-2xl font-bold hover:bg-foreground transition-all w-full sm:w-auto shadow-[0_20px_40px_rgba(198,156,109,0.2)]">
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  const shipping = 5.0;
  const tax = Math.round(cartTotal * 0.08 * 100) / 100;
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const orderTotalBeforeDiscount = cartTotal + shipping + tax;
  const finalTotal = Math.max(0, orderTotalBeforeDiscount - couponDiscount);

  return (
    <div className="pt-24 pb-24 px-6 md:px-12 container mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row gap-16 max-w-7xl mx-auto">
        
        {/* Left Side - Checkout Flow */}
        <div className="flex-1">
          <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>

          <h1 className="text-4xl font-serif font-bold mb-6 text-foreground">Checkout</h1>

          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-16 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-black/5 -z-10 rounded-full" />
            <motion.div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary -z-10 rounded-full" 
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            {STEPS.map((step, idx) => (
              <div key={step} className="flex flex-col items-center gap-3 bg-background px-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 border-4 border-background",
                  idx < currentStep ? "bg-primary text-white scale-90" : idx === currentStep ? "bg-primary text-white shadow-[0_0_20px_rgba(198,156,109,0.3)]" : "bg-black/5 text-muted"
                )}>
                  {idx < currentStep ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", idx <= currentStep ? "text-primary" : "text-muted")}>{step}</span>
              </div>
            ))}
          </div>

          {/* Forms */}
          <div className="glass p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden min-h-[450px] border border-black/5 shadow-2xl bg-white/50">
             {isProcessing && (
               <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                 <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
                 <h3 className="text-2xl font-serif font-bold animate-pulse text-foreground">Processing Order...</h3>
                 <p className="text-muted text-sm mt-2 flex items-center gap-2 font-medium tracking-wide"><ShieldCheck className="w-4 h-4 text-green-500" /> Secure Encryption Active</p>
               </div>
             )}

             <AnimatePresence mode="wait">
               {/* STEP 1: SHIPPING */}
               {currentStep === 0 && (
                 <motion.div 
                   key="step1"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-8"
                 >
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                         <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-serif font-bold text-foreground">Delivery Details</h2>
                   </div>

                   {isAuthenticated && (
                     <div className="space-y-4 mb-6 rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-sm">
                       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                         <div>
                           <p className="text-sm font-semibold text-foreground">Saved Addresses</p>
                           <p className="mt-1 text-sm text-muted">Select one, edit an existing address, or add a new one for this order.</p>
                         </div>
                         <div className="flex flex-wrap gap-3">
                           <button
                             type="button"
                             onClick={handleStartNewAddress}
                             className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-foreground transition-colors hover:border-primary hover:text-primary"
                           >
                             Add New
                           </button>
                           {selectedAddressId && (
                             <button
                               type="button"
                               onClick={() => {
                                 const selected = addresses.find((entry) => entry.id === selectedAddressId);
                                 if (selected) {
                                   handleEditSavedAddress(selected);
                                 }
                               }}
                               className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary transition-colors hover:bg-primary/15"
                             >
                               Edit Selected
                             </button>
                           )}
                         </div>
                       </div>

                       {addresses.length > 0 ? (
                         <div className="space-y-4">
                           {addresses.map((address) => (
                             <div
                               key={address.id}
                               className={`rounded-[1.75rem] border p-5 text-left transition-all shadow-sm ${selectedAddressId === address.id ? "border-primary bg-primary/10 shadow-primary/10" : "border-black/10 bg-slate-50 hover:border-primary/40 hover:bg-white"}`}
                             >
                               <div className="flex items-start justify-between gap-3">
                                 <div>
                                   <p className="text-sm font-semibold text-foreground">{address.label}</p>
                                   {address.isDefault && <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-primary">Primary address</p>}
                                 </div>
                                 <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                                   {selectedAddressId === address.id ? "Selected" : "Saved"}
                                 </span>
                               </div>
                               <div className="mt-4 space-y-2 text-sm text-muted">
                                 <p>{address.name}{address.phone ? ` · ${address.phone}` : ""}</p>
                                 {address.company && <p>{address.company}</p>}
                                 <p>{address.address}{address.apartment ? `, ${address.apartment}` : ""}</p>
                                 <p>{address.city}, {address.state}, {address.country} {address.zip}</p>
                               </div>
                               <div className="mt-5 flex flex-wrap gap-3">
                                 <button
                                   type="button"
                                   onClick={() => handleAddressSelect(address.id)}
                                   className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white transition-colors hover:bg-foreground"
                                 >
                                   Use This
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => handleEditSavedAddress(address)}
                                   className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-foreground transition-colors hover:border-primary hover:text-primary"
                                 >
                                   Edit
                                 </button>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-slate-50 px-5 py-6 text-sm text-muted">
                           No saved addresses yet. Fill the form below and save it for faster checkout next time.
                         </div>
                       )}
                     </div>
                   )}

                   {isAuthenticated && showAddressForm && (
                     <div className="grid grid-cols-1 gap-6 rounded-[2rem] border border-black/5 bg-slate-50/80 p-5 md:grid-cols-[1.1fr_auto] md:items-end">
                       <div className="space-y-2.5">
                         <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Address Label</label>
                         <input
                           type="text"
                           className="w-full border border-black/10 rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium bg-white/80"
                           value={addressLabel}
                           onChange={(e) => setAddressLabel(e.target.value)}
                           placeholder="Home, Work, Office"
                         />
                       </div>
                       <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm font-medium text-foreground">
                         <input
                           type="checkbox"
                           checked={saveAsDefault}
                           onChange={(e) => setSaveAsDefault(e.target.checked)}
                           className="h-4 w-4 accent-primary"
                         />
                         Save as default address
                       </label>
                     </div>
                   )}

                   {(!isAuthenticated || showAddressForm) && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">First Name</label>
                       <input type="text" 
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('firstName')}`} 
                         value={formData.firstName}
                         onChange={(e) => handleInputChange('firstName', e.target.value)}
                         onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Last Name</label>
                       <input type="text" 
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('lastName')}`} 
                         value={formData.lastName}
                         onChange={(e) => handleInputChange('lastName', e.target.value)}
                         onBlur={() => setTouched(prev => ({ ...prev, lastName: true }))}
                       />
                     </div>
                     <div className="space-y-2.5 md:col-span-2 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Street Address</label>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted opacity-40" />
                          <input type="text" 
                            className={`w-full border rounded-2xl px-5 py-4 pl-12 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('address')}`} 
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, address: true }))}
                          />
                       </div>
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Company (optional)</label>
                       <input type="text"
                         className="w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium"
                         value={formData.company}
                         onChange={(e) => handleInputChange('company', e.target.value)}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Apt, Suite, etc. (optional)</label>
                       <input type="text"
                         className="w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium"
                         value={formData.apartment}
                         onChange={(e) => handleInputChange('apartment', e.target.value)}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">City</label>
                       <input type="text" 
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('city')}`} 
                         value={formData.city}
                         onChange={(e) => handleInputChange('city', e.target.value)}
                         onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">State / Province</label>
                       <input type="text"
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('state')}`}
                         value={formData.state}
                         onChange={(e) => handleInputChange('state', e.target.value)}
                         onBlur={() => setTouched(prev => ({ ...prev, state: true }))}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Country / Region</label>
                       <input type="text"
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('country')}`}
                         value={formData.country}
                         onChange={(e) => handleInputChange('country', e.target.value)}
                         onBlur={() => setTouched(prev => ({ ...prev, country: true }))}
                       />
                     </div>
                     <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Postcode</label>
                       <input type="text" 
                         className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('zip')}`} 
                         value={formData.zip}
                          onChange={(e) => handleInputChange('zip', e.target.value)}
                          onBlur={() => setTouched(prev => ({ ...prev, zip: true }))}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit PIN code"
                        />
                      </div>
                    </div>
                   )}

                   {isAuthenticated && showAddressForm && (
                     <div className="rounded-[2rem] border border-black/5 bg-white/80 p-5 shadow-sm">
                       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                         <div>
                           <p className="text-sm font-semibold text-foreground">
                             {editingAddressId ? "Update this saved address" : "Save these delivery details"}
                           </p>
                           <p className="mt-1 text-sm text-muted">
                             {editingAddressId ? "Your changes will update the selected address for future orders too." : "Save this address to reuse it quickly on your next checkout."}
                           </p>
                         </div>
                         <button
                           type="button"
                           onClick={() => void handleSaveAddress()}
                           disabled={addressActionLoading}
                           className="rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white transition-colors hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-70"
                         >
                           {addressActionLoading ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                         </button>
                       </div>
                       {addressMessage && (
                         <p className={`mt-4 text-sm ${addressMessage.toLowerCase().includes("unable") || addressMessage.toLowerCase().includes("please fill") ? "text-red-600" : "text-green-600"}`}>
                           {addressMessage}
                         </p>
                       )}
                     </div>
                   )}
                 </motion.div>
               )}

               {/* STEP 2: PAYMENT */}
               {currentStep === 1 && (
                 <motion.div 
                   key="step2"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-8"
                 >
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                           <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">Payment Method</h2>
                      </div>
                      <div className="flex gap-2">
                         <div className="w-10 h-6 bg-black/5 rounded flex items-center justify-center text-[8px] font-black italic tracking-tighter opacity-70">VISA</div>
                         <div className="w-10 h-6 bg-black/5 rounded flex items-center justify-center text-[8px] font-black italic tracking-tighter opacity-70">MC</div>
                      </div>
                   </div>
                   
                   {/* Premium Credit Card Mockup */}
                   <div className="w-full h-56 bg-[#1A1A1A] rounded-[2rem] p-8 relative overflow-hidden shadow-2xl mb-12 border border-white/5">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 animate-pulse-slow" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] translate-y-1/2 -translate-x-1/4" />
                      
                      <div className="relative z-10 h-full flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                           <div className="w-14 h-10 bg-[#C69C6D]/20 rounded-lg flex items-center justify-center border border-white/10">
                              <div className="w-10 h-7 bg-[#C69C6D]/40 rounded-sm" />
                           </div>
                           <span className="text-xl font-black italic tracking-widest text-[#C69C6D]">AURA</span>
                         </div>
                         <div>
                            <p className="text-white/30 text-[10px] mb-1.5 uppercase tracking-widest font-black">Secure Payment</p>
                            <p className="text-2xl sm:text-3xl tracking-[0.25em] font-mono text-white mb-6">**** **** **** 4242</p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-white/30 text-[8px] uppercase tracking-[0.2em] mb-1">Card Holder</p>
                                <p className="text-sm font-bold text-white tracking-widest uppercase">{formData.cardName || "John Doe"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/30 text-[8px] uppercase tracking-[0.2em] mb-1">Expires</p>
                                <p className="text-sm font-bold text-white tracking-widest">12 / 28</p>
                              </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-2.5 relative">
                     <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Cardholder Name</label>
                     <input type="text" 
                       className={`w-full border rounded-2xl px-5 py-4 focus:outline-none transition-all duration-300 font-medium ${getValidationClass('cardName')}`} 
                       value={formData.cardName}
                       onChange={(e) => handleInputChange('cardName', e.target.value)}
                       onBlur={() => setTouched(prev => ({ ...prev, cardName: true }))}
                     />
                   </div>
                 </motion.div>
               )}

               {/* STEP 3: REVIEW */}
               {currentStep === 2 && (
                 <motion.div 
                   key="step3"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-10"
                 >
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                         <ShieldCheck className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-serif font-bold text-foreground">Final Review</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-black/5 p-8 rounded-3xl border border-black/5 flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-primary font-bold text-xs uppercase tracking-widest">
                           <MapPin className="w-4 h-4" /> Destination
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground mb-1">{formData.firstName} {formData.lastName}</p>
                          <p className="text-sm text-muted leading-relaxed">{formData.company ? `${formData.company}, ` : ""}{formData.address}{formData.apartment ? `, ${formData.apartment}` : ""}</p>
                          <p className="text-sm text-muted leading-relaxed">{formData.city}, {formData.state}, {formData.country} {formData.zip}</p>
                        </div>
                      </div>

                      <div className="bg-black/5 p-8 rounded-3xl border border-black/5 flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-primary font-bold text-xs uppercase tracking-widest">
                           <CreditCard className="w-4 h-4" /> Payment
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground mb-1">Visa ending in 4242</p>
                          <p className="text-sm text-muted">Billed to: {formData.cardName}</p>
                        </div>
                      </div>
                   </div>
                   
                   <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                      <p className="text-sm text-muted">Estimated Delivery Window: <span className="font-bold text-primary">Oct 24 - Oct 26</span></p>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="flex justify-between items-center mt-12">
            <button 
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              className={cn(
                "font-bold transition-all px-8 py-4 rounded-2xl text-base",
                currentStep === 0 ? "opacity-0 pointer-events-none" : "hover:bg-black/5 text-muted hover:text-foreground"
              )}
            >
              Previous
            </button>
            
            <button 
              onClick={handleNext}
              disabled={isProcessing}
              className="bg-primary text-white px-10 py-4.5 rounded-2xl font-bold hover:bg-foreground transition-all duration-300 flex items-center gap-3 shadow-[0_20px_40px_rgba(198,156,109,0.2)]"
            >
              {currentStep === STEPS.length - 1 ? "Complete Order" : "Continue"} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Side - Order Summary */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="glass p-8 rounded-[2.5rem] sticky top-32 border border-black/5 shadow-xl bg-white/50">
            <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3 text-foreground">
              <Coffee className="w-6 h-6 text-primary" /> My Order
            </h3>
            
            <div className="space-y-6 mb-10 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map((item) => (
                <div key={`${item.id}-${item.variant}`} className="flex justify-between items-start group">
                  <div className="flex gap-4">
                     <div className="w-12 h-12 bg-coffee-light/20 rounded-xl flex items-center justify-center shrink-0 border border-black/5">
                        <Coffee className="w-6 h-6 text-primary/50" />
                     </div>
                     <div>
                       <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{item.name}</h4>
                       <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Qty: {item.quantity} • {item.variant}</p>
                     </div>
                  </div>
                  <span className="font-bold text-sm text-foreground">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8 pt-8 border-t border-black/5 font-medium text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-foreground">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span className="text-foreground">₹{shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Estimated Tax</span>
                <span className="text-foreground">₹{tax.toFixed(2)}</span>
              </div>
              <div className="space-y-3 pt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Coupon Code</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 focus:outline-none focus:border-primary"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="bg-primary text-white rounded-2xl px-5 py-3 font-bold hover:bg-foreground transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p className="text-sm text-muted">{couponMessage}</p>
                )}
                {appliedCoupon && (
                  <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-sm text-foreground">
                    <p className="font-semibold">{appliedCoupon.label}</p>
                    <p className="text-sm">Discount saved: ₹{appliedCoupon.discount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {couponDiscount > 0 && (
              <div className="flex justify-between items-center gap-4 text-muted text-sm pb-4 border-b border-black/5">
                <span>Coupon savings</span>
                <span className="text-foreground">-₹{couponDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-black/5 pt-8">
              <span className="text-xl font-bold text-foreground">Order Total</span>
              <span className="text-3xl font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
               <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
               <p className="text-[10px] sm:text-[11px] text-muted font-medium leading-relaxed uppercase tracking-wider">
                 All data is processed using AES-256 bank-level encryption. Your transaction is secure.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
