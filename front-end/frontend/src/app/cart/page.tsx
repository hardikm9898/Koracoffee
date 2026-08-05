"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCart, CartItem } from "@/context/CartContext";
import { Trash2, Plus, Minus, ArrowRight, Coffee, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProducts, type ProductRecord } from "@/lib/data";

export default function CartPage() {
  const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, isCartReady } = useCart();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.items);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Smart Upsell Logic
  const hasBeverage = cart.some(item => {
    const p = products.find(p => p.id === item.id);
    return p && (p.category === "Coffee" || p.category === "Tea");
  });
  const hasPairing = cart.some(item => item.id === 13 || item.id === 15);

  let upsellId = 13; // Default to Jumbo Medjool Dates
  if (hasBeverage && !hasPairing) {
    upsellId = 13; 
  } else if (!hasBeverage && hasPairing) {
    upsellId = 3; // Colombian Supremo
  } else if (!hasBeverage && !hasPairing) {
    upsellId = 1; // Midnight Onyx
  }

  // Hide upsell if it's already in the cart
  const isUpsellInCart = cart.some(item => item.id === upsellId);
  const upsellProduct = isUpsellInCart ? null : products.find(p => p.id === upsellId);

  const handleAddUpsell = () => {
    if (!upsellProduct) return;
    
    const cartItem: CartItem = {
      id: upsellProduct.id,
      name: upsellProduct.name,
      basePrice: upsellProduct.basePrice,
      price: upsellProduct.basePrice, 
      quantity: 1,
      variant: "250g",
    };
    
    addToCart(cartItem);
  };

  if (!isCartReady || loadingProducts) {
    return (
      <div className="page-shell-roomy min-h-screen flex items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-[2.5rem] border border-black/5 bg-white/50 p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Loading your cart</h2>
          <p className="mt-3 text-muted">Fetching your saved items...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="page-shell-roomy min-h-screen flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 rounded-[2.5rem] max-w-md w-full flex flex-col items-center border border-black/5 shadow-xl bg-white/50"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Coffee className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-foreground">Your Cart is Empty</h2>
          <p className="text-muted mb-8 leading-relaxed">Looks like you haven&apos;t added any premium roasts to your cart yet.</p>
          <Link href="/shop" className="w-full bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-foreground transition-all duration-300 shadow-[0_20px_40px_rgba(198,156,109,0.2)]">
            Start Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-shell container mx-auto min-h-screen px-6 md:px-12">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-serif font-bold mb-12"
      >
        Your <span className="gradient-text italic">Cart</span>
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item, index) => (
            <motion.div 
              key={`${item.id}-${item.variant}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 border border-black/5 shadow-lg bg-white/50 group"
            >
              <div className="w-24 h-24 bg-coffee-light/20 rounded-xl flex items-center justify-center shrink-0 border border-black/5 group-hover:bg-coffee-light/40 transition-colors">
                <Coffee className="w-10 h-10 text-primary/60" />
              </div>
              
              <div className="flex-grow text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-bold font-serif text-foreground">{item.name}</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-primary/20">{item.variant}</span>
                </div>
                <p className="text-primary font-bold">₹{item.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-black/5 px-3 py-2 rounded-xl border border-black/5">
                  <button 
                    onClick={() => updateQuantity(item.id, item.variant, item.quantity - 1)}
                    className="text-muted hover:text-foreground transition-colors p-1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-foreground">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.variant, item.quantity + 1)}
                    className="text-muted hover:text-foreground transition-colors p-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id, item.variant)}
                  className="p-2.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}

          {/* Smart Upsell Banner */}
          <AnimatePresence>
            {upsellProduct && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative mt-12"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent rounded-3xl blur-2xl" />
                <div className="glass p-8 rounded-3xl flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden border border-primary/20 shadow-xl bg-white/60 group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] -z-10 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  
                  <div className="flex-grow text-center sm:text-left">
                    <h4 className="text-primary font-bold text-xs uppercase tracking-widest mb-2 flex items-center justify-center sm:justify-start gap-2">
                       <span className="w-1.5 h-1.5 bg-primary rounded-full" /> Perfect Pairing
                    </h4>
                    <h3 className="text-2xl font-bold font-serif text-foreground mb-2">{upsellProduct.name}</h3>
                    <p className="text-sm text-muted line-clamp-2 md:pr-12 md:max-w-md">{upsellProduct.description}</p>
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                    <span className="font-bold text-2xl text-foreground">₹{upsellProduct.basePrice.toFixed(2)}</span>
                    <button 
                      onClick={handleAddUpsell}
                      className="bg-primary text-white hover:bg-foreground transition-all duration-300 font-bold px-8 py-3 rounded-xl shadow-[0_15px_30px_rgba(198,156,109,0.3)] flex items-center gap-2 group/btn"
                    >
                      <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" /> Add to Order
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="glass p-8 rounded-3xl sticky top-32 border border-black/5 shadow-xl bg-white/50">
            <h3 className="text-2xl font-serif font-bold mb-8 pb-6 border-b border-black/5 text-foreground">Order Summary</h3>
            
            <div className="space-y-4 mb-8 text-sm font-medium">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-foreground">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="text-foreground">{cartTotal > 50 ? "Free" : "₹5.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Estimated Tax</span>
                <span className="text-foreground">₹{(cartTotal * 0.08).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-10 pt-6 border-t border-black/5">
              <span className="font-bold text-xl text-foreground">Total</span>
              <span className="font-bold text-3xl text-primary">
                ₹{(cartTotal + (cartTotal > 50 ? 0 : 5) + cartTotal * 0.08).toFixed(2)}
              </span>
            </div>

            <Link 
              href="/checkout"
              className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-foreground transition-all duration-300 shadow-[0_20px_40px_rgba(198,156,109,0.2)] flex items-center justify-center gap-3 group"
            >
              Checkout <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center justify-center gap-2 mt-6 text-muted text-xs font-bold uppercase tracking-widest">
               <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Secure Stripe Payment
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
