import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AppProvider } from "@/context/CartContext";
import MotionProvider from "@/components/motion/MotionProvider";
import { INTRO_STORAGE_KEY } from "@/components/motion/intro";

// Outfit is the body font the theme already expects (--font-outfit); Fraunces
// is the editorial serif used for display headlines (font-display).
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Koura Coffee | Premium Roasters",
    template: "%s | Koura Coffee",
  },
  description: "Experience the ultimate coffee journey. Premium beans, expert roasting.",
  openGraph: {
    siteName: "Koura Coffee",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below may add
    // data-intro-seen to <html> before React hydrates.
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a repeat visit in the same session never
            flashes the logo intro (CSS hides .intro-loader on this flag). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("${INTRO_STORAGE_KEY}"))document.documentElement.dataset.introSeen="1"}catch(e){}`,
          }}
        />
        <noscript>
          <style>{`.intro-loader{display:none!important}.page-enter{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <AppProvider>
          <MotionProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </MotionProvider>
        </AppProvider>
      </body>
    </html>
  );
}
