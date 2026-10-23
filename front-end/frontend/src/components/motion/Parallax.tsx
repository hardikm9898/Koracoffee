"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

type ParallaxProps = {
  children?: ReactNode;
  className?: string;
  /**
   * Pixels the layer travels across its time in the viewport.
   * Positive → moves up faster than the page (foreground feel).
   * Negative → lags behind the page (background feel).
   */
  offset?: number;
};

/** Parallax Scrolling — layers drift at different speeds from the page. */
export default function Parallax({ children, className, offset = 80 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  // A light spring takes the edge off mouse-wheel stepping.
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <motion.div ref={ref} className={className} style={{ y: reduceMotion ? 0 : y }}>
      {children}
    </motion.div>
  );
}
