"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { revealVariants, type RevealDirection } from "./Reveal";

type StaggerProps = {
  children?: ReactNode;
  className?: string;
  /** Seconds between each child starting. */
  stagger?: number;
  delay?: number;
  amount?: number;
};

/**
 * Stagger Reveal — children wrapped in <StaggerItem> appear one after another
 * once the group scrolls into view.
 */
export function Stagger({ children, className, stagger = 0.12, delay = 0, amount = 0.15 }: StaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children?: ReactNode;
  className?: string;
  direction?: RevealDirection;
  distance?: number;
  blur?: boolean;
};

export function StaggerItem({ children, className, direction = "up", distance = 40, blur = true }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={revealVariants(direction, distance, blur)}>
      {children}
    </motion.div>
  );
}
