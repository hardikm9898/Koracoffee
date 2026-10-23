"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};

const useIsDesktop = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );

type HorizontalScrollProps = {
  /** Rendered above the track, inside the pinned frame. */
  header?: ReactNode;
  /** Rendered behind everything inside the pinned frame. */
  background?: ReactNode;
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  id?: string;
};

/**
 * Horizontal Scroll — on desktop the section pins to the screen and its track
 * slides sideways as you keep scrolling down. The section is made exactly as
 * tall as the track is wide, so the vertical scroll maps 1:1 onto it.
 *
 * Below 1024px (and with reduced motion) it falls back to a native
 * swipeable, snap-scrolling row, which feels better on touch.
 */
export default function HorizontalScroll({
  header,
  background,
  children,
  className,
  trackClassName,
  id,
}: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  const pinned = isDesktop && !reduceMotion;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !pinned) return;

    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const x = useSpring(rawX, { stiffness: 140, damping: 32, mass: 0.35 });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32 });

  return (
    <section
      id={id}
      ref={sectionRef}
      // overflow-x: clip keeps oversized background glows from widening the
      // page on phones; unlike "hidden" it doesn't break the sticky pin.
      className={cn("relative overflow-x-clip", className)}
      style={pinned ? ({ height: `calc(100vh + ${distance}px)` } as CSSProperties) : undefined}
    >
      <div
        className={cn(
          "relative flex flex-col justify-center",
          pinned ? "sticky top-0 h-screen overflow-hidden" : "py-16",
        )}
      >
        {background}
        {header}
        <motion.div
          ref={trackRef}
          style={pinned ? { x } : undefined}
          className={cn(
            "relative z-10 flex w-max gap-6",
            !pinned && "w-auto snap-x snap-mandatory overflow-x-auto scrollbar-hide",
            trackClassName,
          )}
        >
          {children}
        </motion.div>

        {pinned ? (
          <div className="relative z-10 mx-auto mt-10 h-[2px] w-[min(420px,60vw)] overflow-hidden rounded-full bg-black/10">
            <motion.div
              className="absolute inset-0 origin-left rounded-full bg-primary"
              style={{ scaleX: progress }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
