"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

type ScaleOnScrollProps = {
  children?: ReactNode;
  className?: string;
  /** Scale while entering from the bottom of the screen. */
  from?: number;
  /** Scale while leaving through the top. Set to 1 to only grow. */
  exitTo?: number;
};

/**
 * Scale on Scroll — the block grows to full size as it reaches the middle of
 * the screen, then gently shrinks again as it scrolls away.
 */
export default function ScaleOnScroll({ children, className, from = 0.86, exitTo = 0.95 }: ScaleOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [from, 1, 1, exitTo]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0.4, 1]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduceMotion ? undefined : { scale, opacity }}
    >
      {children}
    </motion.div>
  );
}
