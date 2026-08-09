import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop Coffee",
  description: "Browse Koura Coffee's full range of single-origin and blended roasts, brewing equipment, and accessories.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-[420px] flex items-center justify-center text-sm text-muted">Loading shop…</div>}>
      <ShopClient />
    </Suspense>
  );
}
