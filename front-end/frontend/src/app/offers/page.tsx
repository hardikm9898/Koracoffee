"use client";

import { motion } from "framer-motion";
import { Coffee, Tag, Sparkles, ArrowRight, Gift, Percent, Clock, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProducts, type ProductRecord } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function OffersPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.items);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const highlightedProducts = products.slice(0, 3);

  if (loading) {
    return (
      <div className="page-shell-roomy min-h-screen flex items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-[2.5rem] border border-black/5 bg-white/50 p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Loading offers</h2>
          <p className="mt-3 text-muted">Fetching our latest deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell container mx-auto min-h-screen overflow-hidden px-6 md:px-12">
      <div className="text-center mb-20 relative">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary font-bold text-xs tracking-widest uppercase mb-6"
          >
            <Tag className="w-4 h-4" /> Exclusive Access
          </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-serif font-bold mb-6"
        >
          Limited <span className="gradient-text italic">Offers</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted text-lg max-w-xl mx-auto"
        >
          Discover curated savings on our seasonal harvests. These values are ephemeral—secure your ritual today.
        </motion.p>

        {/* Decorative Orbs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -z-10" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-coffee-medium/10 blur-[100px] rounded-full -z-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        {/* Main Offer Banner */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-10 md:p-16 rounded-[3rem] border border-primary/20 bg-gradient-to-br from-primary via-primary/80 to-coffee-medium relative overflow-hidden flex flex-col justify-center text-white shadow-2xl"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
           <div className="relative z-10 space-y-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                <Percent className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">Harvest Moon <br/><span className="italic">Festival</span></h2>
              <p className="text-white/80 text-lg max-w-sm">Get Flat <span className="text-white font-bold text-2xl">25% OFF</span> on all subscription plans. Fuel your daily aura for less.</p>
              
              <div className="flex items-center gap-4 py-2">
                 <div className="glass px-4 py-2 rounded-xl border border-white/10 bg-white/10 flex items-center gap-3">
                   <Clock className="w-4 h-4" /> <span className="font-bold text-xs uppercase tracking-widest">Ends in 02:45:12</span>
                 </div>
              </div>

              <Link href="/subscribe" className="bg-white text-primary px-10 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-xl inline-flex items-center gap-3 group w-max">
                Redeem Offer <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>

           {/* Stylized Percent Icon background */}
           <Percent className="absolute -right-16 -bottom-16 w-80 h-80 text-white opacity-5 rotate-12" />
        </motion.div>

        {/* Secondary Offers Column */}
        <div className="space-y-8">
           <motion.div 
             initial={{ opacity: 0, x: 30 }}
             animate={{ opacity: 1, x: 0 }}
             className="glass p-8 rounded-[2rem] border border-black/5 bg-white/50 flex items-center gap-8 shadow-lg group hover:border-primary/30 transition-all"
           >
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                <Gift className="w-10 h-10 text-primary group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-1">Welcome Ritual</h3>
                <p className="text-muted text-sm">Save ₹10 on your first purchase above ₹50. Use code: <span className="font-bold text-primary">AURA10</span></p>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="glass p-8 rounded-[2rem] border border-black/5 bg-white/50 flex items-center gap-8 shadow-lg group hover:border-primary/30 transition-all"
           >
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary transition-all">
                <Coffee className="w-10 h-10 text-primary group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-1">Bundle & Save</h3>
                <p className="text-muted text-sm">Buy 3 single-origin roasts and get the 4th bag at 50% discount.</p>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="glass p-8 rounded-[2rem] border border-black/5 bg-white/50 flex items-center gap-8 shadow-lg group hover:border-primary/30 transition-all"
           >
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary transition-all">
                <Sparkles className="w-10 h-10 text-primary group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-1">Aura Club Rewards</h3>
                <p className="text-muted text-sm">Earn 2x points on all spice and tea purchases this weekend.</p>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Featured Offer Products */}
      <section>
        <div className="flex justify-between items-end mb-10">
           <div>
             <h2 className="text-3xl font-serif font-bold">Offer <span className="italic">Highlights</span></h2>
             <p className="text-muted">Most popular items Currently on Promotion</p>
           </div>
           <Link href="/shop" className="text-primary font-bold hover:underline flex items-center gap-2">
             All Offers <ArrowRight className="w-4 h-4" />
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {highlightedProducts.map((p, i) => (
             <motion.div 
               key={p.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 + (i * 0.1) }}
               className="glass rounded-[2rem] overflow-hidden border border-black/5 bg-white/50 group hover:shadow-2xl transition-all"
             >
                <div className="h-48 bg-coffee-light/20 relative flex items-center justify-center">
                   <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">-15% OFF</div>
                   <Coffee className="w-16 h-16 text-primary/30 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                   <h4 className="font-bold font-serif text-lg mb-1">{p.name}</h4>
                   <div className="flex items-center gap-2 mb-4">
                      <span className="text-primary font-bold text-xl">₹{(p.basePrice * 0.85).toFixed(2)}</span>
                      <span className="text-muted text-sm line-through">₹{p.basePrice.toFixed(2)}</span>
                   </div>
                   <button className="w-full bg-black/5 hover:bg-primary text-foreground hover:text-white py-3 rounded-xl font-bold transition-all text-sm border border-black/5 hover:border-transparent">
                     Quick Add
                   </button>
                </div>
             </motion.div>
           ))}
        </div>
      </section>

      <div className="mt-24 p-12 glass rounded-[3rem] border border-black/5 bg-coffee-light/10 text-center">
         <Star className="w-12 h-12 text-primary/40 mx-auto mb-6" />
         <h3 className="text-3xl font-serif font-bold mb-4 italic">Exclusive Perks for Aura Club Members</h3>
         <p className="text-muted mb-8 max-w-xl mx-auto">Join our elite community and get early access to nano-lots, private cupping events, and complimentary shipping on all orders.</p>
         <Link href="/subscribe" className="bg-primary text-white px-10 py-3.5 rounded-xl font-bold hover:bg-foreground transition-all shadow-lg">Become a Member</Link>
      </div>
    </div>
  );
}
