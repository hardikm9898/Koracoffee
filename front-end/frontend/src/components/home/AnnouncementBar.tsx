"use client";

import { motion } from "framer-motion";
import { Coffee, Star, Zap } from "lucide-react";

const ANNOUNCEMENTS = [
  { text: "GET 5% OFF ON PREPAID ORDERS", icon: Zap },
  { text: "FREE SHIPPING ON ORDERS ABOVE ₹50", icon: Coffee },
  { text: "NEW ARRIVALS JUST DROPPED: HIMALAYAN OOLONG", icon: Star },
  // Duplicate for seamless infinite loop
  { text: "GET 5% OFF ON PREPAID ORDERS", icon: Zap },
  { text: "FREE SHIPPING ON ORDERS ABOVE ₹50", icon: Coffee },
  { text: "NEW ARRIVALS JUST DROPPED: HIMALAYAN OOLONG", icon: Star },
];

export default function AnnouncementBar() {
  return (
    <div className="w-full bg-coffee-dark text-white overflow-hidden py-2.5 md:py-3 relative flex items-center z-40 border-b border-primary/20 shadow-sm shadow-black/10">
      <motion.div
        className="flex whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 60,
        }}
      >
        {/* We map items to ensure seamless infinite scroll by rendering enough copies to fill 200% width */}
        {[...Array(2)].map((_, arrayIndex) => (
          <div key={arrayIndex} className="flex items-center justify-around w-1/2 shrink-0">
            {ANNOUNCEMENTS.map((item, index) => (
              <div key={`${arrayIndex}-${index}`} className="flex items-center mx-8 md:mx-16">
                <item.icon className="w-4 h-4 text-primary mr-3" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/90">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
