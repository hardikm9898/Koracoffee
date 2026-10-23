"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import HorizontalScroll from "@/components/motion/HorizontalScroll";
import Parallax from "@/components/motion/Parallax";
import Reveal from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import FloatingCups from "./FloatingCups";

export type RailCategory = { id: string; name: string; image: string };

const CARD_CLASS =
  "group relative block h-[56vh] max-h-[560px] min-h-[380px] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[2rem] sm:w-[52vw] lg:w-[30vw] lg:max-w-[440px]";

/**
 * "Test the Magic" — categories as tall editorial cards on a horizontal track
 * that moves sideways while the page scrolls down (see HorizontalScroll).
 */
export default function CategoryRail({ categories }: { categories: RailCategory[] }) {
  return (
    <HorizontalScroll
      id="categories"
      className="bg-background"
      trackClassName="px-6 md:px-12 lg:pl-[max(3rem,calc((100vw-80rem)/2+3rem))] lg:pr-24"
      background={
        <>
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-coffee-medium/10 blur-[120px]" />
          <Parallax offset={-60} className="pointer-events-none absolute inset-0">
            <FloatingCups />
          </Parallax>
        </>
      }
      header={
        <div className="container relative z-10 mx-auto mb-10 flex flex-col gap-6 px-6 md:px-12 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Reveal blur={false} distance={16}>
              <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.35em] text-primary">
                The Collection
              </span>
            </Reveal>
            <TextReveal
              className="text-4xl font-bold text-foreground md:text-6xl"
              lines={[<>Test The <span className="gradient-text italic">Magic</span></>]}
            />
          </div>
          <Reveal delay={0.2} className="max-w-md">
            <p className="text-muted">
              Beyond exceptional coffee, discover our curated selection of rare teas, artisanal dry fruits, and
              ethically sourced spices.
            </p>
            <p className="mt-3 hidden text-xs font-bold uppercase tracking-[0.3em] text-primary lg:block">
              Keep scrolling →
            </p>
          </Reveal>
        </div>
      }
    >
      {categories.map((category, index) => (
        <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.name)}`} className={CARD_CLASS}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image}
            alt={category.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-dark/85 via-coffee-dark/20 to-transparent" />
          <div className="absolute left-6 top-6 font-mono text-sm text-white/80">0{index + 1}</div>
          <div className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-all duration-500 group-hover:rotate-45 group-hover:bg-primary group-hover:border-primary">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div className="absolute inset-x-6 bottom-6">
            <h3 className="text-3xl font-bold text-white md:text-4xl">{category.name}</h3>
            <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
              Explore collection
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </span>
          </div>
        </Link>
      ))}

      {/* Closing card */}
      <Link
        href="/shop"
        className={`${CARD_CLASS} flex flex-col items-start justify-end bg-primary p-8 text-white`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/20 transition-transform duration-[1.4s] group-hover:scale-125" />
        <div className="absolute -right-4 -top-4 h-40 w-40 rounded-full border border-white/20 transition-transform duration-[1.4s] group-hover:scale-125" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/70">Everything</p>
          <h3 className="mt-3 text-4xl font-bold leading-tight">
            Shop the full
            <br />
            collection
          </h3>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-primary transition-transform duration-300 group-hover:-translate-y-1">
            View all <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </HorizontalScroll>
  );
}
