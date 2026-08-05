"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartColumn, ChevronRight, LogOut, MessageSquareText, Package, Settings, ShoppingCart, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/lib/admin-auth";

const adminLinks = [
  { label: "Overview", href: "/", icon: ChartColumn },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: Store },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Reviews", href: "/reviews", icon: MessageSquareText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutAdmin();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="admin-surface w-full shrink-0 rounded-[2rem] bg-[linear-gradient(180deg,_rgba(250,246,240,0.96)_0%,_rgba(255,255,255,0.96)_100%)] p-4 sm:p-5 lg:w-[19rem] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="flex h-full flex-col">
        <div className="rounded-[1.6rem] bg-coffee-dark px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-black tracking-[0.2em] text-white">AU</div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Aura Admin</p>
              <h1 className="text-xl font-bold tracking-[-0.03em]">Control Room</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/72">
            Separate admin frontend for operations, reporting, and catalog control.
          </p>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-w-max items-center justify-between gap-4 rounded-[1.35rem] border px-4 py-3.5 transition-all duration-200 lg:min-w-0",
                  isActive ? "border-primary/30 bg-primary/12 text-primary shadow-sm" : "border-transparent bg-white/75 text-foreground/75 hover:border-black/8 hover:bg-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <link.icon className="h-5 w-5" />
                  <span className="font-semibold">{link.label}</span>
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-[1.4rem] border border-primary/15 bg-primary/8 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Shared backend</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            This admin app is intended to connect to the same root backend used by the website frontend.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <Store className="h-4 w-4" />
            Backend: `../backend`
          </div>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-black/6 bg-white/80 p-4 lg:mt-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">On duty</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coffee-light text-sm font-bold text-coffee-dark">VM</div>
            <div>
              <p className="font-semibold text-foreground">Varsha Mehta</p>
              <p className="text-sm text-muted">Operations lead</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-slate-50 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>
    </aside>
  );
}
