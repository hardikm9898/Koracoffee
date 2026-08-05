"use client";

import { motion } from "framer-motion";
import { ArrowRight, Coffee, Globe2, Heart, Leaf, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="page-shell overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-6 md:px-12 mb-32">
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary font-bold text-xs tracking-widest uppercase mb-8"
          >
            <Sparkles className="w-4 h-4" /> Our Story
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight mb-8"
          >
            Crafting the <span className="gradient-text italic">Aura</span> of Tomorrow
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          >
            Founded in 2024, Aura Coffee was born from a simple obsession: to redefine the artisanal experience. From the high altitudes of the Himalayas to the volcanic soils of Colombia, we source the impossible.
          </motion.p>
        </div>

        {/* Background Drift */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-coffee-light/20 blur-[120px] rounded-full -z-10" />
      </section>

      {/* Philosophy Section */}
      <section className="px-6 md:px-12 py-24 bg-black/5 relative overflow-hidden">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">A Philosophy of <span className="italic">Excellence</span></h2>
              <p className="text-muted text-lg leading-relaxed">
                We believe that every bean, leaf, and spice carries a unique energy—an aura. Our ritual is to preserve that energy through precision roasting and climate-controlled storage.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                    <Leaf className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Ethical Sourcing</h4>
                    <p className="text-muted text-sm">Direct-trade relationships that empower farmers and protect biodiversity.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                    <Globe2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Global Rareness</h4>
                    <p className="text-muted text-sm">We hunt for micro-lots that never reach the traditional market.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Purity Guarantee</h4>
                    <p className="text-muted text-sm">No additives, no shortcuts. Just the pure, unadulterated flavor of nature.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square glass rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl flex items-center justify-center bg-white/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-coffee-light/40 to-white" />
              <Coffee className="w-48 h-48 text-primary opacity-20 animate-pulse-slow" />

              <div className="absolute inset-10 border border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-20 border border-primary/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 md:px-12 py-32">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Direct Farms", value: "42+", icon: MapPin },
              { label: "Flavor Profiles", value: "150+", icon: Star },
              { label: "Happy Ritualists", value: "12k+", icon: Users },
              { label: "Ethical Impact", value: "100%", icon: Heart },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-2"
              >
                <div className="text-4xl md:text-5xl font-serif font-bold text-primary">{stat.value}</div>
                <div className="text-xs font-bold text-muted uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 py-24 container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass p-12 md:p-24 rounded-[3.5rem] bg-gradient-to-r from-primary to-coffee-medium text-center relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-8">Join the Evolution of Ritual</h2>
            <Link href="/shop" className="bg-white text-primary px-12 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-xl inline-flex items-center gap-3 group">
              Shop Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />
        </motion.div>
      </section>
    </div>
  );
}

function MapPin(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
