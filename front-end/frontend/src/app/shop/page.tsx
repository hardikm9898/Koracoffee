import { Suspense } from "react";
import ShopClient from "./ShopClient";

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-[420px] flex items-center justify-center text-sm text-muted">Loading shop…</div>}>
      <ShopClient />
    </Suspense>
  );
}
