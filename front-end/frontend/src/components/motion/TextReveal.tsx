"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE_EXPO_OUT } from "./ease";

type TextRevealProps = {
  /** One entry per visual line. Lines can contain markup (e.g. a gradient span). */
  lines: ReactNode[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /**
   * Omit to reveal when scrolled into view. Pass a boolean to drive it
   * manually (e.g. the hero waits for the intro curtain to lift).
   */
  play?: boolean;
};

/**
 * Scroll-Triggered Text Reveal — each line slides up from behind a mask,
 * one after another, like type being set.
 */
export function TextReveal({
  lines,
  as: Tag = "h2",
  className,
  lineClassName,
  delay = 0,
  stagger = 0.12,
  play,
}: TextRevealProps) {
  const trigger =
    play === undefined
      ? { whileInView: "show", viewport: { once: true, amount: 0.4 } }
      : { animate: play ? "show" : "hidden" };

  return (
    <Tag className={className}>
      <motion.span
        className="block"
        initial="hidden"
        {...trigger}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: stagger, delayChildren: delay } },
        }}
      >
        {lines.map((line, i) => (
          // Padding + negative margin keeps descenders and italic overhang
          // from being clipped by the mask.
          <span key={i} className="-mb-[0.14em] block overflow-hidden pb-[0.14em] pr-[0.08em]">
            <motion.span
              className={cn("block will-change-transform", lineClassName)}
              variants={{
                hidden: { y: "115%", rotate: 2.5 },
                show: { y: "0%", rotate: 0, transition: { duration: 1.1, ease: EASE_EXPO_OUT } },
              }}
              style={{ transformOrigin: "0% 100%" }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

function ScrubWord({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block whitespace-pre">
      {word}{" "}
    </motion.span>
  );
}

/**
 * Scroll-scrubbed variant: words light up one by one, tied directly to scroll
 * position — used for the testimonial quote.
 */
export function ScrollWordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");

  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <ScrubWord
            key={i}
            word={word}
            progress={scrollYProgress}
            range={[i / words.length, (i + 1) / words.length]}
          />
        ))}
      </span>
    </p>
  );
}
