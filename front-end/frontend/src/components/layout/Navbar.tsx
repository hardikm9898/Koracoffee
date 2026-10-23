"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Menu, X, User, Heart, ArrowRight, LogOut, Package } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementBar from "@/components/home/AnnouncementBar";
import { clearSession, getStoredSession, getVerifiedAuthToken } from "@/lib/auth";

const NAV_LINKS = [
  { name: "Home", href: "/#hero" },
  { name: "Arrivals", href: "/#arrivals" },
  { name: "Magic", href: "/#categories" },
  // { name: "Press", href: "/#story" },
  // { name: "Craft", href: "/#brew" },
  // { name: "Club", href: "/#club" },
  { name: "Shop", href: "/shop" },
];

const PROFILE_MENU_ITEMS = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Orders", href: "/profile?tab=orders", icon: Package },
  { label: "Favorites", href: "/favorites", icon: Heart },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  // True while the home page's dark scroll story (#hero) is behind the navbar.
  // null until measured; the home page opens on the story, so it starts dark there.
  const [overDarkHero, setOverDarkHero] = useState<boolean | null>(null);
  // True while the story is still pinned on screen (not yet scrolled past).
  const [storyPlaying, setStoryPlaying] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionUserName, setSessionUserName] = useState("");
  const { cartCount, favorites } = useCart();
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const favoritesCount = Array.isArray(favorites) ? favorites.length : 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const hero = pathname === "/" ? document.getElementById("hero") : null;
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      setOverDarkHero(Boolean(hero && heroBottom > (navRef.current?.offsetHeight ?? 90)));
      // The pinned story releases when the hero's bottom reaches the bottom of
      // the viewport — that's when the full header and offers arrive.
      const playing = Boolean(hero && heroBottom > window.innerHeight + 4);
      setStoryPlaying(playing);
      // Don't leave the mobile menu open behind a logo-only header.
      if (playing) setIsMobileMenuOpen(false);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);
  const dark = overDarkHero ?? pathname === "/";
  // While the home story plays, the header is just the logo; the links,
  // icons and the offer banner arrive once the story has been scrolled past.
  const storyMode = storyPlaying ?? pathname === "/";

  useEffect(() => {
    const syncAuthState = async () => {
      const session = getStoredSession();
      setSessionUserName(session?.user?.name || "");

      if (!session?.token) {
        setIsAuthenticated(false);
        return;
      }

      const verifiedToken = await getVerifiedAuthToken();
      setIsAuthenticated(Boolean(verifiedToken));
    };

    void syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("auth-changed", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("auth-changed", syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const desktopMenu = profileMenuRef.current;
      const mobileMenu = mobileProfileMenuRef.current;

      if (desktopMenu && desktopMenu.contains(target)) return;
      if (mobileMenu && mobileMenu.contains(target)) return;
      setIsProfileMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const profileHref = isAuthenticated ? "/profile" : `/login?returnTo=${encodeURIComponent(pathname || "/")}`;
  const accountLabel = sessionUserName.trim() || "Account";
  const accountInitial = accountLabel.charAt(0).toUpperCase() || "A";
  const getMenuHref = (label: string, href: string) => {
    if (isAuthenticated) return href;
    if (["Favorites"].includes(label)) return href;
    return profileHref;
  };

  const handleLogout = () => {
    clearSession({ resetGuestSession: true });
    setIsProfileMenuOpen(false);
    router.push("/");
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      const element = document.getElementById(targetId);

      if (element) {
        e.preventDefault();
        // Navbar height, plus the offer strip that hangs under it on the home page.
        const offset = pathname === "/" ? 130 : 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({ top: offsetPosition, behavior: "smooth" });

        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        window.history.pushState(null, "", `#${targetId}`);
      }
    }
  };

  return (
    <>
      {/* ── Navbar ── */}
      <nav
        ref={navRef}
        className={cn(
          // Home: fixed, so the offer banner opening above the nav row never
          // shifts the page (and the story runs full-bleed behind it).
          pathname === "/" ? "fixed inset-x-0 top-0" : "sticky top-0",
          "z-50 w-full border-b px-4 backdrop-blur-md transition-colors duration-500 sm:px-6 md:px-12",
          storyMode
            ? "border-transparent bg-transparent backdrop-blur-none"
            : dark
              ? "border-white/10 bg-[#140D09]/55"
              : "border-black/5 bg-background/95",
          isScrolled && !dark ? "shadow-sm" : "shadow-none"
        )}
      >
        {/* Running offers, above the nav row. On the home page it stays closed
            while the story plays and slides open once it's been scrolled past. */}
        {pathname === "/" ? (
          <div
            inert={storyMode}
            aria-hidden={storyMode}
            className={cn(
              "-mx-4 grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:-mx-6 md:-mx-12",
              storyMode ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            )}
          >
            <div className="overflow-hidden">
              <AnnouncementBar />
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl items-center justify-between gap-3 py-3 sm:py-4",
            isScrolled ? "lg:py-3" : "lg:py-5"
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex h-14 items-center gap-2.5">
              <Image
                src="/logo/koura-mark.png"
                alt="Koura Coffee"
                width={116}
                height={110}
                priority
                className={cn("h-10 w-auto object-contain transition-[filter] duration-500 sm:h-11", dark && "invert")}
              />
              <span className="flex flex-col leading-none">
                <span className={cn("text-lg font-black tracking-[0.06em] transition-colors duration-500 sm:text-xl", dark ? "text-white" : "text-foreground")}>KOURA</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary sm:text-[11px]">Coffee</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div
            inert={storyMode}
            className={cn(
              "hidden lg:flex items-center gap-2 transition-all duration-500",
              storyMode ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            )}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className={cn(
                  "px-5 py-2 text-[13px] font-bold uppercase tracking-[0.2em] hover:text-primary transition-all duration-300 relative group",
                  dark ? "text-white/80" : "text-foreground/80"
                )}
              >
                {link.name}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-1/4 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>

          {/* Desktop Icons */}
          <div
            inert={storyMode}
            className={cn(
              "hidden items-center gap-2 lg:flex md:gap-3 transition-all duration-500",
              storyMode ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            )}
          >
            <Link
              href="/favorites"
              className={cn(
                "relative rounded-2xl p-2.5 transition-all duration-300 hover:text-primary group",
                dark ? "text-white/75 hover:bg-white/10" : "text-foreground/70 hover:bg-black/5"
              )}
            >
              <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {favoritesCount > 0 ? (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_8px_16px_rgba(244,63,94,0.35)]" />
              ) : null}
            </Link>
            <Link
              href="/cart"
              className={cn(
                "relative rounded-2xl p-2.5 transition-all duration-300 hover:text-primary group",
                dark ? "text-white/75 hover:bg-white/10" : "text-foreground/70 hover:bg-black/5"
              )}
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[9px] flex items-center justify-center rounded-full font-black shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all duration-300 hover:border-primary/20 hover:text-primary",
                  dark ? "bg-white/10 text-white/85" : "bg-white/70 text-foreground/80",
                  isAuthenticated ? (dark ? "border-white/10" : "border-black/8") : "border-transparent"
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-xs font-black text-primary">
                  {isAuthenticated ? accountInitial : <User className="h-4 w-4" />}
                </span>
                <span className="truncate text-sm font-semibold">{isAuthenticated ? accountLabel : "Sign in"}</span>
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-full z-[120] mt-3 w-[235px] overflow-hidden rounded-[1.15rem] border border-black/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(251,247,241,0.98)_100%)] shadow-[0_16px_36px_rgba(28,18,12,0.14)] backdrop-blur-md"
                  >
                    <div className="border-b border-black/6 px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-primary">Account</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{isAuthenticated ? accountLabel : "Guest"}</p>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto p-1.5">
                      {PROFILE_MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            href={getMenuHref(item.label, item.href)}
                            onClick={() => setIsProfileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm transition-colors hover:bg-black/5",
                              !isAuthenticated && item.label !== "Support" && "opacity-70"
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 font-medium text-foreground">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="border-t border-black/6 p-1.5">
                      {isAuthenticated ? (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-[0.95rem] bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700">
                            <LogOut className="h-3.5 w-3.5" />
                          </span>
                          Logout
                        </button>
                      ) : (
                        <Link
                          href={profileHref}
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex w-full items-center gap-3 rounded-[0.95rem] bg-primary px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-foreground"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white">
                            <LogOut className="h-3.5 w-3.5 rotate-180" />
                          </span>
                          Sign in
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile: Icons + Hamburger */}
          <div
            inert={storyMode}
            className={cn(
              "flex items-center gap-2 lg:hidden transition-all duration-500",
              storyMode ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            )}
          >
            <div ref={mobileProfileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                className={cn(
                  "rounded-2xl p-2.5 transition-colors hover:text-primary",
                  dark ? "text-white/80 hover:bg-white/10" : "text-foreground/75 hover:bg-black/5",
                  isAuthenticated && (dark ? "border border-white/10 bg-white/10" : "border border-black/8 bg-white/70")
                )}
              >
                {isAuthenticated ? (
                  <span className="flex h-5 w-5 items-center justify-center text-[10px] font-black text-primary">
                    {accountInitial}
                  </span>
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-[120] mt-2 w-[220px] overflow-hidden rounded-[1.1rem] border border-black/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(251,247,241,0.98)_100%)] p-1.5 shadow-[0_14px_32px_rgba(28,18,12,0.14)] backdrop-blur-md"
                  >
                    <Link
                      href={profileHref}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      {isAuthenticated ? "My profile" : "Sign in"}
                    </Link>
                    <Link
                      href={isAuthenticated ? "/profile?tab=orders" : profileHref}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Package className="h-3.5 w-3.5" />
                      </span>
                      Orders
                    </Link>
                    <Link
                      href="/favorites"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Heart className="h-3.5 w-3.5" />
                      </span>
                      Favorites
                    </Link>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="mt-1 flex w-full items-center gap-3 rounded-[0.9rem] bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        Logout
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link
              href="/favorites"
              className={cn(
                "relative rounded-2xl p-2.5 transition-colors hover:text-primary",
                dark ? "text-white/80 hover:bg-white/10" : "text-foreground/75 hover:bg-black/5"
              )}
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 ? (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_8px_16px_rgba(244,63,94,0.35)]" />
              ) : null}
            </Link>
            <Link
              href="/cart"
              className={cn(
                "relative rounded-2xl p-2.5 transition-colors hover:text-primary",
                dark ? "text-white/80 hover:bg-white/10" : "text-foreground/75 hover:bg-black/5"
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              id="mobile-menu-toggle"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all",
                dark ? "border-white/15 bg-white/10 text-white hover:bg-white/20" : "border-black/8 bg-white/80 text-foreground hover:bg-black/5"
              )}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

      </nav>

      {/* ── Mobile Menu — OUTSIDE <nav> to avoid sticky stacking-context breaking fixed positioning ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[200] bg-black/40 lg:hidden"
          >
            {/* Drawer panel */}
            <motion.div
              key="mobile-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 flex h-full w-[85%] max-w-[340px] flex-col bg-[linear-gradient(180deg,_#fdfbf8_0%,_#f5ede4_100%)] px-5 pb-8 pt-6 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-black/6 pb-4">
                <div>
                      <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src="/logo/koura-mark.png"
                      alt="Koura Coffee"
                      width={116}
                      height={110}
                      className="h-9 w-auto object-contain"
                    />
                    <span className="flex flex-col leading-none">
                      <span className="text-base font-black tracking-[0.06em] text-foreground">KOURA</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary">Coffee</span>
                    </span>
                  </Link>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Navigation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/8 bg-white/70 text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav Links */}
              <div className="mt-5 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {NAV_LINKS.map((link, idx) => (
                    <motion.div
                      key={link.href}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.04 * idx }}
                    >
                      <Link
                        href={link.href}
                        onClick={(e) => {
                          scrollToSection(e, link.href);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center justify-between rounded-[1.2rem] border border-black/6 bg-white/70 px-4 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/20 hover:text-primary"
                      >
                        <span>{link.name}</span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Access Grid */}
                <div className="mt-5 rounded-[1.4rem] border border-primary/12 bg-white/65 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Quick Access
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Link
                      href={profileHref}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center rounded-[1rem] bg-background px-3 py-3 text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                    >
                      <User className="mb-2 h-4 w-4 text-primary" />
                      Profile
                    </Link>
                    <Link
                      href="/favorites"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center rounded-[1rem] bg-background px-3 py-3 text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                    >
                      <Heart className="mb-2 h-4 w-4 text-primary" />
                      Saves
                    </Link>
                    <Link
                      href="/cart"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center rounded-[1rem] bg-background px-3 py-3 text-[11px] font-semibold text-muted transition-colors hover:text-primary"
                    >
                      <ShoppingCart className="mb-2 h-4 w-4 text-primary" />
                      Cart
                    </Link>
                  </div>
                </div>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.4rem] border border-red-200 bg-red-50/90 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-red-700 transition hover:bg-red-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                )}
              </div>

              {/* Footer CTA */}
              <div className="mt-5 border-t border-black/6 pt-4">
                <Link
                  href="/subscribe"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[1.15rem] bg-primary px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg"
                >
                  Join Koura Club <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
