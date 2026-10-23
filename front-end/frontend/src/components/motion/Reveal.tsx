"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_EXPO_OUT } from "./ease";

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

const offsetFor = (direction: RevealDirection, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
};

export const revealVariants = (
  direction: RevealDirection = "up",
  distance = 40,
  blur = true,
  timing: { delay?: number; duration?: number } = {},
): Variants => ({
  hidden: {
    opacity: 0,
    ...offsetFor(direction, distance),
    ...(blur ? { filter: "blur(8px)" } : {}),
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    ...(blur ? { filter: "blur(0px)" } : {}),
    transition: { duration: timing.duration ?? 0.9, delay: timing.delay ?? 0, ease: EASE_EXPO_OUT },
  },
});

type RevealProps = {
  children?: ReactNode;
  className?: string;
  direction?: RevealDirection;
  distance?: number;
  delay?: number;
  duration?: number;
  blur?: boolean;
  /** Fraction of the element that must be visible before it reveals. */
  amount?: number;
};

/** Scroll Reveal — the element fades, de-blurs and slides in as it enters the viewport. */
export default function Reveal({
  children,
  className,
  direction = "up",
  distance = 40,
  delay = 0,
  duration = 0.9,
  blur = true,
  amount = 0.2,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={revealVariants(direction, distance, blur, { delay, duration })}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}
