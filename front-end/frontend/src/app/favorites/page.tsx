"use client";

import { motion } from "framer-motion";
import { Coffee, Star, ShoppingBag, Heart, ArrowRight } from "lucide-react";
import { useAppContext } from "@/context/CartContext";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useAppContext();

  if (favorites.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 rounded-[2.5rem] max-w-md w-full flex flex-col items-center border border-black/5 shadow-xl bg-white/50"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
            <Heart className="w-12 h-12 text-primary opacity-50" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-foreground">Aura is Waiting</h2>
          <p className="text-muted mb-10 leading-relaxed">Your favorites list is empty. Start exploring our curated collections to find your daily ritual.</p>
          <Link href="/shop" className="w-full bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-foreground transition-all duration-300 shadow-[0_20px_40px_rgba(198,156,109,0.2)] flex items-center justify-center gap-2 group">
            Discover Collection <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-shell container mx-auto min-h-screen px-6 md:px-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Your <span className="gradient-text italic">Saves</span></h1>
        <p className="text-muted max-w-xl">A curated list of your most desired roasts and artisanal blends.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {favorites.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass rounded-[2rem] overflow-hidden group flex flex-col h-full relative border border-black/5 shadow-lg bg-white/50"
          >
            <button 
              onClick={() => toggleFavorite(product)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/60 backdrop-blur-md hover:bg-white/90 transition-colors shadow-md border border-black/5"
              aria-label="Remove favorite"
            >
              <Heart className="w-5 h-5 transition-colors fill-red-500 text-red-500" />
            </button>

            <Link href={`/shop/${product.id}`} className="h-64 bg-coffee-light/20 relative flex items-center justify-center p-8 overflow-hidden group-hover:bg-coffee-light/30 transition-colors duration-500 block">
              <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent z-10" />
              <Coffee className="w-24 h-24 text-primary/30 group-hover:scale-110 group-hover:text-primary/50 transition-all duration-500 z-0" />
              <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider text-primary border border-primary/20">
                {product.category}
              </div>
            </Link>
            
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="text-xl font-serif font-bold group-hover:text-primary transition-colors text-foreground">{product.name}</h3>
                <span className="font-bold text-lg text-primary shrink-0">₹{product.basePrice.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted flex-grow mb-6 leading-relaxed line-clamp-2">{product.notes}</p>
              
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-black/5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="text-sm font-bold text-foreground">{product.rating}</span>
                </div>
                
                <Link 
                  href={`/shop/${product.id}`}
                  className="bg-black/5 hover:bg-primary text-foreground hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 group/btn border border-black/10 hover:border-transparent"
                >
                  <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Select Options
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
