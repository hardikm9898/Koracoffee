"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useIntro } from "@/components/motion/MotionProvider";
import { EASE_EXPO_OUT, EASE_IN_OUT } from "@/components/motion/ease";

/**
 * Page reveal. A template re-mounts on every navigation, so each page gets:
 * a cream curtain lifting away (with a thin gold leading edge), and the page
 * content rising into place behind it. On a fresh load the content waits for
 * `introDone` so it rises as the logo intro lifts rather than unseen beneath it.
 */
export default function Template({ children }: { children: ReactNode }) {
  const { introDone } = useIntro();

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[90] origin-top bg-coffee-light"
        // Only covers on client-side navigations (intro already finished).
        // On a fresh load the logo intro is the reveal, so the curtain starts open.
        initial={{ scaleY: introDone ? 1 : 0 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.7, ease: EASE_IN_OUT, delay: 0.05 }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />
      </motion.div>

      <motion.div
        className="page-enter"
        initial={{ opacity: 0, y: 32 }}
        animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
        transition={{ duration: 0.9, ease: EASE_EXPO_OUT, delay: 0.25 }}
      >
        {children}
      </motion.div>
    </>
  );
}
