"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useIntro } from "@/components/motion/MotionProvider";
import { TextReveal } from "@/components/motion/TextReveal";
import { EASE_EXPO_OUT } from "@/components/motion/ease";
import { cn } from "@/lib/utils";

type FrameSet = { path: string; width: number; height: number; frameCount: number };
type Manifest = { version: number; ext: string; desktop: FrameSet; mobile: FrameSet };

/**
 * Landing shot: on arrival the first frames play by themselves and freeze
 * with the green beans hanging mid-air in the light; scrolling continues from
 * this frame (0-based).
 */
const START_FRAME = 5;

// Scroll progress (0–1) where each video scene begins, after the START_FRAME
// offset: origin, roast, grind, brew, your cup. From manifest.json sceneStarts.
const SCENE_STARTS = [0, 0.19, 0.4, 0.61, 0.82];

const INTRO_END = 0.05;
const FINALE_AT = 0.84;
const CHAPTERS = [
  {
    label: "Origin",
    lines: ["Sourced at", "altitude."],
    body: "Single-estate micro-lots, hand-picked at peak ripeness.",
    range: [0.07, 0.17],
  },
  {
    label: "Roast",
    lines: ["Roasted in", "small batches."],
    body: "Every batch profiled to bring out the bean’s own character.",
    range: [0.22, 0.37],
  },
  {
    label: "Grind",
    lines: ["Ground", "moments before."],
    body: "Fresh grounds, so nothing is lost before the brew.",
    range: [0.43, 0.58],
  },
  {
    label: "Brew",
    lines: ["Pulled with", "patience."],
    body: "A slow, steady pour for a rich, golden crema.",
    range: [0.64, 0.79],
  },
] as const;

// Chapter index on the right — where each entry jumps to.
const INDEX = [
  { label: "Origin", at: 0.11 },
  { label: "Roast", at: 0.3 },
  { label: "Grind", at: 0.5 },
  { label: "Brew", at: 0.71 },
  { label: "Your cup", at: 0.92 },
];

// Shown until real frames exist in public/sequence (see project-context/coffee-story-video-brief.md).
const STILLS = [
  { src: "/banners/scattered-beans-transparent.png", contain: true },
  { src: "/categories/coffee.png", contain: false },
  { src: "/videos/brewing-poster.png", contain: false },
  { src: "/promo/french-press.png", contain: false },
];

const BG = "#140D09";
const SITE_GUTTER = "md:left-[max(3rem,calc((100vw-80rem)/2+3rem))]";

// Deterministic "random" dust specks (same on server and client).
const DUST = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${(32 + r(1) * 40).toFixed(2)}%`,
    top: `${(38 + r(2) * 40).toFixed(2)}%`,
    size: Number((1 + r(3) * 2.4).toFixed(2)),
    style: {
      "--dust-x": `${((r(4) - 0.5) * 80).toFixed(1)}px`,
      "--dust-duration": `${(7 + r(5) * 7).toFixed(2)}s`,
      "--dust-delay": `${(-r(6) * 12).toFixed(2)}s`,
      "--dust-opacity": (0.25 + r(7) * 0.45).toFixed(2),
    } as CSSProperties,
  };
});

type Stage = "intro" | "finale" | number | null;

const stageAt = (value: number): Stage => {
  if (value < INTRO_END) return "intro";
  if (value >= FINALE_AT) return "finale";
  const index = CHAPTERS.findIndex(({ range }) => value >= range[0] && value < range[1]);
  return index >= 0 ? index : null;
};

const sceneAt = (value: number) => {
  let scene = 0;
  SCENE_STARTS.forEach((start, i) => {
    if (value >= start) scene = i;
  });
  return scene;
};

/** undefined = still checking, null = no frames built yet. */
function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/sequence/manifest.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Manifest | null) => {
        if (!cancelled) setManifest(data?.desktop?.frameCount ? data : null);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return manifest;
}

/**
 * Draws the frame for the current position onto a canvas ("cover" fit,
 * retina-aware). Frame = landing teaser (0 → START_FRAME) + scroll progress
 * across the remaining frames. All frames are requested up front in order;
 * until one arrives the nearest earlier loaded frame is shown.
 */
function FrameCanvas({
  manifest,
  progress,
  teaser,
}: {
  manifest: Manifest;
  progress: MotionValue<number>;
  teaser: MotionValue<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const currentRef = useRef(0);
  const [set] = useState(() => (window.innerWidth < 768 ? manifest.mobile : manifest.desktop));
  const [loadedCount, setLoadedCount] = useState(0);
  const [firstFrameReady, setFirstFrameReady] = useState(false);

  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let i = index;
    while (i > 0 && !loadedRef.current[i]) i -= 1;
    const img = framesRef.current[i];
    if (!img || !loadedRef.current[i]) return;

    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }, []);

  const indexNow = useCallback(() => {
    const last = set.frameCount - 1;
    const start = Math.min(START_FRAME, last);
    const p = Math.min(1, Math.max(0, progress.get()));
    return Math.round(start * teaser.get() + p * (last - start));
  }, [set.frameCount, progress, teaser]);

  const update = useCallback(() => {
    const index = indexNow();
    if (index === currentRef.current) return;
    currentRef.current = index;
    requestAnimationFrame(() => draw(currentRef.current));
  }, [indexNow, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw(currentRef.current);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const frames: HTMLImageElement[] = [];
    const flags = new Array<boolean>(set.frameCount).fill(false);
    framesRef.current = frames;
    loadedRef.current = flags;
    currentRef.current = indexNow();
    let settled = 0;

    const onSettled = (i: number, ok: boolean) => {
      flags[i] = ok;
      settled += 1;
      if (ok && i === 0) setFirstFrameReady(true);
      if (ok && i <= currentRef.current) draw(currentRef.current);
      if (settled % 12 === 0 || settled === set.frameCount) setLoadedCount(settled);
    };

    for (let i = 0; i < set.frameCount; i += 1) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => onSettled(i, true);
      img.onerror = () => onSettled(i, false);
      img.src = `${set.path}${String(i + 1).padStart(4, "0")}.${manifest.ext}?v=${manifest.version}`;
      frames.push(img);
    }

    return () => {
      frames.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [set, manifest, draw, indexNow]);

  useMotionValueEvent(progress, "change", update);
  useMotionValueEvent(teaser, "change", update);

  const loading = loadedCount < set.frameCount;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-out",
          firstFrameReady ? "opacity-100" : "opacity-0",
        )}
      />
      {loading ? (
        <div className="absolute inset-x-0 top-0 z-30 h-[2px] bg-white/10">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${(loadedCount / set.frameCount) * 100}%` }}
          />
        </div>
      ) : null}
    </>
  );
}

function Still({
  src,
  contain,
  index,
  progress,
}: {
  src: string;
  contain: boolean;
  index: number;
  progress: MotionValue<number>;
}) {
  const total = STILLS.length;
  const start = index / total;
  const end = (index + 1) / total;
  const fade = 0.04;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const opacity = useTransform(
    progress,
    isFirst ? [0, end - fade, end + fade] : isLast ? [start - fade, start + fade, 1] : [start - fade, start + fade, end - fade, end + fade],
    isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const scale = useTransform(progress, [Math.max(0, start - fade), end], [1.14, 1]);

  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <motion.img
        src={src}
        alt=""
        style={{ scale }}
        className={contain ? "h-full w-full object-contain p-[14vh] md:p-[12vh]" : "h-full w-full object-cover opacity-80"}
      />
    </motion.div>
  );
}

/** One caption block; only one is mounted at a time (AnimatePresence "wait"). */
function Caption({ children, ready = true, interactive = false }: { children: ReactNode; ready?: boolean; interactive?: boolean }) {
  return (
    <motion.div
      className={interactive ? "pointer-events-auto" : undefined}
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 28, filter: "blur(8px)" }}
      exit={{ opacity: 0, y: -28, filter: "blur(8px)", transition: { duration: 0.3, ease: "easeIn" } }}
      transition={{ duration: 0.7, ease: EASE_EXPO_OUT }}
    >
      {children}
    </motion.div>
  );
}

function Kicker({ number, children }: { number: string; children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70 md:text-xs">
      <span className="font-mono tracking-normal text-primary">{number}</span>
      <span className="h-px w-8 bg-primary/60" />
      {children}
    </p>
  );
}

const TITLE = "font-display text-[2.35rem] font-normal leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[4.5rem]";
const BODY = "mt-4 max-w-sm text-sm leading-relaxed text-white/65 md:mt-5 md:text-base";
const PRIMARY_BUTTON =
  "group inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-[13px] font-semibold md:gap-3 md:px-7 md:py-3.5 md:text-sm text-white shadow-[0_16px_40px_rgba(178,124,78,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary";
const CORNER_RIGHT = "right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]";

/**
 * Home hero — "From bean to cup". The screen stays pinned while scrolling
 * plays the coffee-making video frame by frame (canvas image sequence, the
 * Apple-style technique). One caption per stage, a clickable chapter index,
 * film grain, drifting dust and a soft mouse parallax for depth.
 *
 * Frames come from `npm run sequence`; until then, still photos cross-fade
 * through the same story so the page is complete either way.
 */
export default function CoffeeStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const { introDone } = useIntro();
  const manifest = useManifest();
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Slightly smoothed so wheel "steps" scrub fluidly instead of jumping.
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3 });
  const percent = useTransform(progress, (v) => String(Math.round(Math.min(1, Math.max(0, v)) * 100)).padStart(3, "0"));

  // Landing teaser: once the logo intro lifts, play the first frames.
  const teaser = useMotionValue(0);
  useEffect(() => {
    if (!introDone) return;
    if (reduceMotion) {
      teaser.set(1);
      return;
    }
    const controls = animate(teaser, 1, { duration: 1.8, delay: 0.3, ease: [0.33, 0, 0.2, 1] });
    return () => controls.stop();
  }, [introDone, reduceMotion, teaser]);

  // Mouse parallax (desktop): the picture drifts against the cursor and the
  // text slightly with it — a subtle sense of depth.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const imageX = useSpring(pointerX, { stiffness: 50, damping: 20 });
  const imageY = useSpring(pointerY, { stiffness: 50, damping: 20 });
  const textX = useTransform(imageX, (v) => v * -0.35);
  const textY = useTransform(imageY, (v) => v * -0.35);
  useEffect(() => {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth - 0.5) * -28);
      pointerY.set((event.clientY / window.innerHeight - 0.5) * -18);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion, pointerX, pointerY]);

  // Caption + chapter index, driven by the same smoothed progress as the
  // canvas so the words always match the picture.
  const [stage, setStage] = useState<Stage>("intro");
  const [scene, setScene] = useState(0);
  useMotionValueEvent(progress, "change", (value) => {
    const nextStage = stageAt(value);
    const nextScene = sceneAt(value);
    setStage((current) => (current === nextStage ? current : nextStage));
    setScene((current) => (current === nextScene ? current : nextScene));
  });

  const jumpTo = (at: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const distance = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + at * distance, behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      ref={sectionRef}
      // Starts at the very top: on the home page the navbar is fixed and
      // transparent over the story.
      className="relative h-[500vh]"
      style={{ background: BG }}
      aria-label="From bean to cup — the Koura coffee story"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Picture. Mobile: the top ~70% of the screen, so the subject never sits
            under the text. Desktop: full-bleed, slightly oversized so the mouse
            parallax never shows an edge. */}
        <motion.div className="absolute inset-x-0 top-0 h-[70svh] md:-inset-6 md:h-auto" style={{ x: imageX, y: imageY }}>
          {manifest ? (
            <FrameCanvas manifest={manifest} progress={progress} teaser={teaser} />
          ) : manifest === null ? (
            STILLS.map((still, i) => <Still key={still.src} index={i} progress={progress} {...still} />)
          ) : null}
        </motion.div>

        {/* Atmosphere: dust in the light beam, vignette, text fades, film grain */}
        <div className="pointer-events-none absolute inset-0 z-[11]" aria-hidden="true">
          {DUST.map((dust, i) => (
            <span
              key={i}
              className="dust-particle absolute rounded-full bg-[#f6dcb8] blur-[0.5px]"
              style={{ left: dust.left, top: dust.top, width: dust.size, height: dust.size, ...dust.style }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_55%_55%,transparent_40%,rgba(10,6,4,0.7)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#140D09]/85 to-transparent" />
        {/* Text backdrop — mobile: solid below the picture, fading up into its
            lower edge; desktop: from the left. */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(0deg,#140D09_0%,#140D09_28%,rgba(20,13,9,0.75)_37%,rgba(20,13,9,0)_52%)] md:bg-[linear-gradient(90deg,#140D09_0%,rgba(20,13,9,0.85)_28%,rgba(20,13,9,0.3)_50%,rgba(20,13,9,0)_68%)]" />
        <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden opacity-[0.08] mix-blend-overlay" aria-hidden="true">
          <div className="film-grain absolute -inset-1/2" />
        </div>

        {/* Text — exactly one caption at a time */}
        <motion.div
          style={{ x: textX, y: textY }}
          className={cn(
            "pointer-events-none absolute inset-x-6 bottom-[max(1.75rem,5svh)] z-20 md:bottom-auto md:right-auto md:top-1/2 md:w-[min(36rem,44vw)] md:-translate-y-1/2",
            SITE_GUTTER,
          )}
        >
          {/* A single child whose key changes per stage — the pattern
              AnimatePresence "wait" handles reliably (exit, then enter). */}
          <AnimatePresence mode="wait">
            {stage === null ? null : stage === "intro" ? (
              <Caption key="intro" ready={introDone} interactive>
                <Kicker number="K°">Small-batch roasters</Kicker>
                <TextReveal
                  as="h1"
                  play={introDone}
                  delay={0.2}
                  stagger={0.14}
                  className="font-display text-[3.1rem] font-normal leading-[0.95] tracking-[-0.03em] text-white sm:text-7xl lg:text-[6.2rem]"
                  lines={["From bean", <>to <em className="gradient-text pr-2">cup.</em></>]}
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{ duration: 0.9, delay: 0.8, ease: EASE_EXPO_OUT }}
                >
                  <p className={BODY}>Ethically sourced, roasted in small batches. Scroll to watch your cup come alive.</p>
                  <div className="mt-6 flex items-center gap-3 md:mt-8 md:gap-4">
                    <Link href="/shop" className={PRIMARY_BUTTON}>
                      <span className="sm:hidden">Shop now</span>
                      <span className="hidden sm:inline">Shop the collection</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => jumpTo(INDEX[0].at)}
                      className="group inline-flex items-center gap-2.5 rounded-full border border-white/20 px-5 py-3 text-[13px] font-semibold text-white/85 backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:text-white md:gap-3 md:px-7 md:py-3.5 md:text-sm"
                    >
                      <span className="sm:hidden">Watch story</span>
                      <span className="hidden sm:inline">Watch the story</span>
                      <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </div>
                </motion.div>
              </Caption>
            ) : typeof stage === "number" ? (
              <Caption key={`chapter-${stage}`}>
                <Kicker number={`0${stage + 1}`}>{CHAPTERS[stage].label}</Kicker>
                <TextReveal as="h2" play className={TITLE} lines={[...CHAPTERS[stage].lines]} />
                <motion.p
                  className={BODY}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.35, ease: EASE_EXPO_OUT }}
                >
                  {CHAPTERS[stage].body}
                </motion.p>
              </Caption>
            ) : (
              <Caption key="finale" interactive>
                <Kicker number="05">Your cup</Kicker>
                <TextReveal
                  as="h2"
                  play
                  className={TITLE}
                  lines={["Your cup", <>is <em className="gradient-text pr-2">ready.</em></>]}
                />
                <p className={BODY}>Freshly roasted, delivered to your door.</p>
                <Link href="/shop" className={cn(PRIMARY_BUTTON, "mt-6 md:mt-8")}>
                  Shop the collection
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Caption>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Chapter index (desktop) */}
        <motion.nav
          aria-label="Story chapters"
          initial={{ opacity: 0, x: 20 }}
          animate={introDone ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 1, delay: 1.1, ease: EASE_EXPO_OUT }}
          className={cn("absolute top-1/2 z-20 hidden -translate-y-1/2 lg:block", CORNER_RIGHT)}
        >
          {/* <ol className="space-y-5">
            {INDEX.map((item, i) => {
              const active = stage !== "intro" && scene === i;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => jumpTo(item.at)}
                    aria-current={active ? "step" : undefined}
                    className="group flex w-full items-center justify-end gap-4"
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.3em] transition-colors duration-500",
                        active ? "text-white" : "text-white/35 group-hover:text-white/70",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="font-mono text-[11px] text-primary/80">0{i + 1}</span>
                    <span
                      className={cn(
                        "h-px transition-all duration-500",
                        active ? "w-10 bg-primary" : "w-4 bg-white/25 group-hover:w-6 group-hover:bg-white/50",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ol> */}
        </motion.nav>

        {/* Corner details (desktop) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: introDone ? 1 : 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          className={cn(
            "pointer-events-none absolute bottom-8 z-20 hidden text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40 md:block",
            SITE_GUTTER,
          )}
        >
          Est. 2024 · Small-batch roasters
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: introDone ? 1 : 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          className={cn("pointer-events-none absolute bottom-8 z-20 hidden items-baseline gap-3 text-white/40 md:flex", CORNER_RIGHT)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">Brewing</span>
          <motion.span className="font-mono text-sm tabular-nums text-white/70">{percent}</motion.span>
          <span className="font-mono text-[10px]">%</span>
        </motion.div>

        {/* Scroll cue (desktop, landing only) */}
        <AnimatePresence>
          {stage === "intro" && introDone ? (
            <motion.div
              key="cue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.8 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="pointer-events-none absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/50">Scroll</span>
              <span className="relative h-12 w-px overflow-hidden bg-white/15">
                <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-primary" />
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
