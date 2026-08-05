"use client";

import { ShoppingCart, Leaf, Wind } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Coffee Bean SVG ──────────────────────────────────────────────────────────
type BeanProps = { className: string; style?: CSSProperties };

function CoffeeBean({ className, style }: BeanProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 140" className={className} style={style}>
      <defs>
        <linearGradient id="bean-grad" x1="10%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stopColor="#d8a57c" />
          <stop offset="48%" stopColor="#8c5935" />
          <stop offset="100%" stopColor="#4e2d1b" />
        </linearGradient>
      </defs>
      <path d="M50 6C24 6 7 29 7 60c0 39 22 74 43 74 24 0 43-34 43-74C93 29 75 6 50 6Z" fill="url(#bean-grad)" />
      <path d="M58 18C42 35 36 58 38 85c1 18 7 33 18 45" fill="none" stroke="#f5e5d6" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.8" />
    </svg>
  );
}

// ─── Tea Leaf SVG ─────────────────────────────────────────────────────────────
function TeaLeaf({ className, style }: BeanProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 140" className={className} style={style}>
      <defs>
        <linearGradient id="leaf-grad" x1="10%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stopColor="#a8d5a2" />
          <stop offset="48%" stopColor="#4a8c5c" />
          <stop offset="100%" stopColor="#1e4d2b" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="70" rx="34" ry="60" fill="url(#leaf-grad)" />
      <path d="M50 10 C50 10 50 130 50 130" fill="none" stroke="#c8edc5" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M50 40 C35 52 28 65 32 80" fill="none" stroke="#c8edc5" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5" />
      <path d="M50 40 C65 52 72 65 68 80" fill="none" stroke="#c8edc5" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}

// ─── Slide Data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "coffee",
    badge: { icon: "leaf", text: "100% Ethically Sourced" },
    label: "Black coffee is awesome.",
    heading: ["Time Discover", "Coffee House"],
    headingColor: "#8B5A2B",
    description:
      "Sip the extraordinary. Ethically sourced, perfectly roasted artisan coffee designed to awaken your senses and redefine your mornings.",
    cta: { label: "Explore Coffee", href: "/shop?category=Coffee" },
    ghostCta: { label: "View All →", href: "/shop" },
    image: "/banners/banner-image-4.png",
    imageAlt: "Coffee splash cup and beans",
    blendMode: "normal" as const, // already transparent PNG
    // Color theme
    bg: "linear-gradient(180deg,#f8f3eb 0%,#f5eee4 46%,#f2eae1 100%)",
    accentColor: "#B27C4E",
    textColor: "#2A1C16",
    mutedColor: "#7A6355",
    glowColor: "rgba(178,124,78,0.4)",
    shadowColor: "rgba(178,124,78,0.28)",
    blobColor: "#d5ab7e",
    DecorEl: CoffeeBean,
    mobileDecorBeans: [
      { top: "10%", right: "-0.5rem", width: 52, rotate: "18deg", opacity: 0.45 },
      { top: "70%", left: "-0.5rem", width: 58, rotate: "-22deg", opacity: 0.4 },
    ] as { top: string; right?: string; left?: string; width: number; rotate: string; opacity: number }[],
    desktopBeansLeft: [
      { top: "7%", left: "-0.7rem", width: 76, rotate: "-18deg", opacity: 1 },
      { top: "30%", left: "2.6rem", width: 54, rotate: "24deg", opacity: 0.95 },
      { top: "59%", left: "-1.8rem", width: 132, rotate: "-30deg", opacity: 0.92 },
      { top: "83%", left: "2.5rem", width: 48, rotate: "-36deg", opacity: 0.92 },
    ] as { top: string; left: string; width: number; rotate: string; opacity: number }[],
    desktopBeansRight: [
      { top: "8%", right: "-0.7rem", width: 72, rotate: "16deg", opacity: 0.95 },
      { top: "30%", right: "3rem", width: 44, rotate: "-24deg", opacity: 0.92 },
      { top: "56%", right: "2.8rem", width: 58, rotate: "18deg", opacity: 0.92 },
      { top: "72%", right: "-1.2rem", width: 118, rotate: "26deg", opacity: 0.95 },
    ] as { top: string; right: string; width: number; rotate: string; opacity: number }[],
  },
  {
    id: "tea",
    badge: { icon: "wind", text: "Rare Single-Origin Teas" },
    label: "Serenity in every sip.",
    heading: ["Pure Leaf", "Tea House"],
    headingColor: "#2d6a4f",
    description:
      "Hand-picked from misty mountain gardens. Our curated teas deliver calm, focus, and a quiet luxury that transforms every moment.",
    cta: { label: "Explore Tea", href: "/shop?category=Tea" },
    ghostCta: { label: "View All →", href: "/shop" },
    image: "/banners/banner-image-2.png",
    imageAlt: "Elegant tea cup with loose leaf tea",
    blendMode: "multiply" as const, // JPEG — multiply removes the white background
    // Color theme
    bg: "linear-gradient(180deg,#f0f7f4 0%,#e8f4ef 46%,#dff0e8 100%)",
    accentColor: "#4a8c5c",
    textColor: "#1a3a2a",
    mutedColor: "#4a6858",
    glowColor: "rgba(74,140,92,0.4)",
    shadowColor: "rgba(74,140,92,0.28)",
    blobColor: "#88c4a0",
    DecorEl: TeaLeaf,
    mobileDecorBeans: [
      { top: "8%", right: "-0.5rem", width: 48, rotate: "22deg", opacity: 0.4 },
      { top: "68%", left: "-0.4rem", width: 55, rotate: "-18deg", opacity: 0.38 },
    ] as { top: string; right?: string; left?: string; width: number; rotate: string; opacity: number }[],
    desktopBeansLeft: [
      { top: "8%", left: "-0.5rem", width: 68, rotate: "-20deg", opacity: 0.85 },
      { top: "32%", left: "2rem", width: 48, rotate: "18deg", opacity: 0.8 },
      { top: "60%", left: "-1.5rem", width: 110, rotate: "-28deg", opacity: 0.78 },
      { top: "82%", left: "2rem", width: 44, rotate: "-30deg", opacity: 0.8 },
    ] as { top: string; left: string; width: number; rotate: string; opacity: number }[],
    desktopBeansRight: [
      { top: "10%", right: "-0.5rem", width: 64, rotate: "14deg", opacity: 0.82 },
      { top: "32%", right: "2.5rem", width: 40, rotate: "-20deg", opacity: 0.78 },
      { top: "58%", right: "2rem", width: 52, rotate: "16deg", opacity: 0.8 },
      { top: "74%", right: "-1rem", width: 100, rotate: "24deg", opacity: 0.82 },
    ] as { top: string; right: string; width: number; rotate: string; opacity: number }[],
  },
];

const SLIDE_DURATION = 3000; // 3 seconds per slide

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImageBannerSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(goNext, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [goNext, isPaused]);

  const slide = SLIDES[current];
  const BadgeIcon = slide.badge.icon === "wind" ? Wind : Leaf;

  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero banner slider"
    >
      {/* ── Animated background ── */}
      <motion.div
        key={`bg-${slide.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="absolute inset-0"
        style={{ background: slide.bg }}
      />

      {/* ── Desktop decorative elements | Left ── */}
      <AnimatePresence mode="wait">
        {slide.desktopBeansLeft.map((bean, i) => (
          <motion.div
            key={`dl-${slide.id}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: bean.opacity, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="hidden md:block pointer-events-none absolute z-10"
            style={{
              top: bean.top,
              left: bean.left,
              width: `${bean.width}px`,
              height: `${bean.width * 1.4}px`,
            }}
          >
            <slide.DecorEl
              className="w-full h-full"
              style={{ transform: `rotate(${bean.rotate})` }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Desktop decorative elements | Right ── */}
      <AnimatePresence mode="wait">
        {slide.desktopBeansRight.map((bean, i) => (
          <motion.div
            key={`dr-${slide.id}-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: bean.opacity, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="hidden md:block pointer-events-none absolute z-10"
            style={{
              top: bean.top,
              right: bean.right,
              width: `${bean.width}px`,
              height: `${bean.width * 1.4}px`,
            }}
          >
            <slide.DecorEl
              className="w-full h-full"
              style={{ transform: `rotate(${bean.rotate})` }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Mobile decorative elements ── */}
      {slide.mobileDecorBeans.map((bean, i) => (
        <slide.DecorEl
          key={`mob-${slide.id}-${i}`}
          className="md:hidden pointer-events-none absolute z-10"
          style={{
            top: bean.top,
            ...(bean.right !== undefined ? { right: bean.right } : {}),
            ...(bean.left !== undefined ? { left: bean.left } : {}),
            width: `${bean.width}px`,
            height: `${bean.width * 1.4}px`,
            transform: `rotate(${bean.rotate})`,
            opacity: bean.opacity,
          }}
        />
      ))}

      {/* ── Main grid ── */}
      <div className="relative z-20 container mx-auto grid min-h-[88vh] max-w-7xl items-center gap-4 px-6 py-10 md:min-h-[72vh] md:gap-10 md:px-10 md:py-14 lg:min-h-[560px] xl:min-h-[760px] lg:grid-cols-[0.94fr_1.06fr] lg:px-12">

        {/* ── Copy block ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`copy-${slide.id}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mx-auto w-full max-w-[520px] flex flex-col items-center text-center md:items-start md:text-left lg:ml-16"
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4 backdrop-blur-sm shadow-sm"
              style={{
                borderColor: `${slide.accentColor}40`,
                background: `${slide.accentColor}18`,
              }}
            >
              <BadgeIcon className="h-3 w-3 shrink-0" style={{ color: slide.accentColor }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: slide.accentColor }}
              >
                {slide.badge.text}
              </span>
            </div>

            {/* Sub-label */}
            <p
              className="text-[0.9rem] font-semibold tracking-widest uppercase"
              style={{ color: slide.accentColor }}
            >
              {slide.label}
            </p>

            {/* Heading */}
            <h1
              className="mt-3 text-[2.55rem] font-black font-serif uppercase leading-[0.88] sm:mt-5 sm:text-[4rem] lg:text-[4.5rem] xl:text-[5rem]"
              style={{ color: slide.textColor }}
            >
              {slide.heading[0]}
              <span className="block mt-2 sm:mt-0" style={{ color: slide.headingColor }}>
                {slide.heading[1]}
              </span>
            </h1>

            {/* Description */}
            <p
  className="mt-4 max-w-[420px] text-[1rem] leading-[1.75] sm:mt-6 sm:text-[1.25rem] sm:leading-9"
  style={{ color: slide.mutedColor }}
>
  {slide.description}
</p>

            {/* CTAs */}
            <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:items-center md:flex-row xl:mt-10">
              <Link
                href={slide.cta.href}
                className="group relative inline-flex items-center gap-3 rounded-full px-8 py-4 text-[0.95rem] font-semibold text-white transition-all duration-300 hover:-translate-y-1 active:scale-95"
                style={{
                  background: slide.accentColor,
                  boxShadow: `0 16px 40px ${slide.shadowColor}`,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 rounded-full animate-ping opacity-50 group-hover:opacity-0 transition-opacity"
                  style={{ background: `${slide.accentColor}50` }}
                />
                {slide.cta.label}
                <ShoppingCart className="h-4 w-4 shrink-0" />
              </Link>

              <Link
                href={slide.ghostCta.href}
                className="text-[0.78rem] font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-100 transition-opacity opacity-70"
                style={{ color: slide.headingColor }}
              >
                {slide.ghostCta.label}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Image block ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${slide.id}`}
            initial={{ opacity: 0, scale: 0.96, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: -30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative flex min-h-[230px] items-center justify-center sm:min-h-[320px] lg:min-h-[460px] xl:min-h-[560px]"
          >
            {/* Glow blob */}
            <div
              className="absolute h-56 w-56 rounded-full blur-[90px] sm:h-72 sm:w-72 lg:h-80 lg:w-80"
              style={{ background: `${slide.blobColor}40` }}
            />
            <div className="absolute left-1/2 top-[46%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-[75px] sm:h-60 sm:w-60" />

            {/* Image */}
            <div className="relative h-[230px] w-full max-w-[640px] sm:h-[360px] lg:h-[420px] xl:h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="absolute inset-0 h-full w-full object-contain object-center"
                style={{
                  mixBlendMode: slide.blendMode,
                  filter: slide.blendMode === "multiply"
                    ? "drop-shadow(0 20px 40px rgba(74,140,92,0.25))"
                    : "drop-shadow(0 28px 45px rgba(0,0,0,0.12))",
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </section>
  );
}
