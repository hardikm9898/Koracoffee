"use client";

import { MotionConfig } from "framer-motion";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import PageLoader from "./PageLoader";

type IntroState = {
  /** True once the logo intro has finished (or was skipped this session). */
  introDone: boolean;
};

const IntroContext = createContext<IntroState>({ introDone: true });

export const useIntro = () => useContext(IntroContext);

/**
 * Wraps the storefront with:
 * - MotionConfig reducedMotion="user": visitors with "reduce motion" enabled
 *   get opacity-only transitions instead of movement.
 * - The first-visit logo intro (PageLoader), and an `introDone` flag so the
 *   hero and page reveal wait until the intro curtain lifts instead of
 *   playing unseen underneath it.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  return (
    <MotionConfig reducedMotion="user">
      <IntroContext.Provider value={{ introDone }}>
        {children}
        <PageLoader onReveal={finishIntro} />
      </IntroContext.Provider>
    </MotionConfig>
  );
}
