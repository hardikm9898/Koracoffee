"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

type AdminAppShellProps = {
  children: ReactNode;
};

export default function AdminAppShell({ children }: AdminAppShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(178,124,78,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(42,28,22,0.08),_transparent_24%),linear-gradient(180deg,_#f8f1e7_0%,_#fcfaf7_34%,_#f3ece3_100%)] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
      {isLoginPage ? (
        <main className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-2.5rem)]">
          {children}
        </main>
      ) : (
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <AdminSidebar />
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      )}
    </div>
  );
}
