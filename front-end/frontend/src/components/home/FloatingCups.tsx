"use client";

import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloatingCups() {
  return (
    <div className="absolute inset-0 -top-20 -bottom-20 w-full pointer-events-none overflow-visible hidden md:block">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          animate={{
            y: [0, (i % 2 === 0 ? -20 : 20), 0],
            rotate: [0, (i % 3 === 0 ? 15 : -15), 0],
            x: [0, (i % 4 === 0 ? 10 : -10), 0]
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4
          }}
          className="absolute pointer-events-none"
          style={{
            left: `${(i * 8.5) % 100}%`,
            top: `${(i * 13) % 100}%`,
            opacity: 0.05 + ((i % 5) * 0.04)
          }}
        >
          <Coffee
            className={cn(
              "text-primary/40",
              i % 4 === 0 ? "w-4 h-4" : i % 4 === 1 ? "w-6 h-6" : i % 4 === 2 ? "w-8 h-8" : "w-10 h-10"
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}
