"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type AnimationProps = {
  children?: ReactNode;
  className?: string;
  animationType?: "fade-up" | "fade-left" | "fade-right" | "bounce" | "scale-up";
  delay?: number;
  duration?: number;
  viewportMargin?: string;
  viewportAmount?: "all" | "some" | number;
};

export default function ScrollAnimation({
  children,
  className,
  animationType = "fade-up",
  delay = 0,
  duration = 0.8,
  viewportMargin = "-50px",
  viewportAmount = 0.1,
}: AnimationProps) {
  
  const variants = {
    hidden: {
      opacity: 0,
       ...(animationType === "fade-up" && { y: 20 }),
       ...(animationType === "fade-left" && { x: 50 }),
       ...(animationType === "fade-right" && { x: -50 }),
       ...(animationType === "bounce" && { y: [0, 10, 0] }),
       ...(animationType === "scale-up" && { scale: 0.95 })
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: "easeOut" as any
      }
    }
  };

  if (animationType === "bounce") {
    return (
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" as any }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: viewportMargin as any, amount: viewportAmount as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
