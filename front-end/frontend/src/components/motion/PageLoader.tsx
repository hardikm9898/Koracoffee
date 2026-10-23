"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { EASE_EXPO_OUT, EASE_IN_OUT } from "./ease";
import { INTRO_STORAGE_KEY } from "./intro";

const INTRO_HOLD_MS = 2300;

/** Skip the intro for repeat visits this session and for reduced-motion users. */
const shouldSkipIntro = () => {
  let seen = false;
  try {
    seen = Boolean(window.sessionStorage.getItem(INTRO_STORAGE_KEY));
  } catch {
    // Storage blocked (private mode etc.) — just play the intro.
  }
  return seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
const noopSubscribe = () => () => {};
const WORDMARK = ["K", "bean", "U", "R", "A"] as const;

function Bean() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 140" className="h-[0.82em] w-[0.6em]">
      <defs>
        <linearGradient id="loader-bean" x1="10%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stopColor="#c58a5c" />
          <stop offset="50%" stopColor="#7a4a2b" />
          <stop offset="100%" stopColor="#3d2416" />
        </linearGradient>
      </defs>
      <path d="M50 6C24 6 7 29 7 60c0 39 22 74 43 74 24 0 43-34 43-74C93 29 75 6 50 6Z" fill="url(#loader-bean)" />
      <path d="M58 18C42 35 36 58 38 85c1 18 7 33 18 45" fill="none" stroke="#f5e5d6" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.75" />
    </svg>
  );
}

/**
 * Premium logo reveal shown once per browser session:
 * 1. The K mark wipes in bottom-to-top while settling from a soft zoom.
 * 2. A gold rule draws under it, the KOURA wordmark rises letter by letter
 *    (the O is a roasted bean, as in the logo), COFFEE opens up its tracking.
 * 3. A 0→100 counter runs, then two layered curtains (cream, then espresso)
 *    sweep upward to unveil the page.
 *
 * The overlay is server-rendered so there is no flash of the page before it.
 * A tiny inline script in layout.tsx marks <html data-intro-seen> for repeat
 * visits within the session, and CSS hides the overlay before hydration.
 */
export default function PageLoader({ onReveal }: { onReveal: () => void }) {
  const [phase, setPhase] = useState<"intro" | "exit" | "gone">("intro");
  const count = useMotionValue(0);
  const countLabel = useTransform(count, (v) => String(Math.round(v)).padStart(3, "0"));
  // Server snapshot is false so the overlay is in the server HTML; CSS hides it
  // pre-hydration when skipped, and this unmounts it once hydrated.
  const skip = useSyncExternalStore(noopSubscribe, shouldSkipIntro, () => false);

  useEffect(() => {
    if (shouldSkipIntro()) {
      onReveal();
      return;
    }

    const root = document.documentElement;
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const counter = animate(count, 100, { duration: 1.9, ease: EASE_IN_OUT, delay: 0.2 });
    const timer = window.setTimeout(() => {
      setPhase("exit");
      onReveal();
    }, INTRO_HOLD_MS);

    return () => {
      counter.stop();
      window.clearTimeout(timer);
      root.style.overflow = "";
    };
  }, [count, onReveal]);

  const handleExitComplete = () => {
    if (phase !== "exit") return;
    document.documentElement.style.overflow = "";
    try {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setPhase("gone");
  };

  if (phase === "gone" || (skip && phase === "intro")) return null;

  const exiting = phase === "exit";

  return (
    <div className="intro-loader fixed inset-0 z-[1000]" aria-hidden="true">
      {/* Back curtain (espresso) — trails the front one for a layered wipe */}
      <motion.div
        className="absolute inset-0 bg-coffee-dark"
        initial={{ y: "0%" }}
        animate={{ y: exiting ? "-100%" : "0%" }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT, delay: exiting ? 0.18 : 0 }}
        onAnimationComplete={handleExitComplete}
      />

      {/* Front curtain (cream) with the logo */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#FBF6EF]"
        initial={{ y: "0%" }}
        animate={{ y: exiting ? "-100%" : "0%" }}
        transition={{ duration: 0.85, ease: EASE_IN_OUT }}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[90px]" />

        <motion.div
          className="relative flex flex-col items-center"
          animate={exiting ? { y: -60, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_IN_OUT }}
        >
          {/* K mark — diagonal-feeling wipe from the bottom */}
          <motion.div
            className="relative h-24 w-24 md:h-32 md:w-32"
            initial={{ clipPath: "inset(100% 0% 0% 0%)", scale: 1.18, opacity: 0 }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: EASE_EXPO_OUT, delay: 0.15 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/koura-mark.png"
              alt=""
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </motion.div>

          {/* Gold rule */}
          <motion.span
            className="mt-6 block h-px w-24 origin-center bg-gradient-to-r from-transparent via-primary to-transparent md:w-32"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: EASE_EXPO_OUT, delay: 0.6 }}
          />

          {/* KOURA wordmark */}
          <div className="mt-5 flex items-center text-4xl font-black leading-none tracking-[0.06em] text-coffee-dark md:text-6xl">
            {WORDMARK.map((letter, i) => (
              <span key={i} className="inline-flex overflow-hidden pb-[0.06em]">
                <motion.span
                  className="inline-flex items-center"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.8, ease: EASE_EXPO_OUT, delay: 0.75 + i * 0.07 }}
                >
                  {letter === "bean" ? <Bean /> : letter}
                </motion.span>
              </span>
            ))}
          </div>

          {/* COFFEE — tracking opens up */}
          <motion.span
            className="mt-3 text-xs font-semibold uppercase text-primary-dark md:text-sm"
            initial={{ opacity: 0, letterSpacing: "0.15em" }}
            animate={{ opacity: 1, letterSpacing: "0.75em" }}
            transition={{ duration: 1.3, ease: EASE_EXPO_OUT, delay: 1.15 }}
          >
            Coffee
          </motion.span>
        </motion.div>

        {/* Footer row: tagline + counter */}
        <motion.div
          className="absolute inset-x-6 bottom-8 flex items-end justify-between text-coffee-dark md:inset-x-12 md:bottom-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          transition={{ duration: 0.6, delay: exiting ? 0 : 0.5 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted md:text-xs">
            Premium Roasters · Est. 2024
          </span>
          <span className="font-mono text-3xl font-light tabular-nums text-primary md:text-5xl">
            <motion.span>{countLabel}</motion.span>
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
