import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="page-shell mx-auto w-full max-w-5xl px-6 md:px-12">
      <div className="rounded-[2.2rem] border border-black/6 bg-coffee-light/20 p-8 shadow-[0_22px_60px_rgba(42,28,22,0.08)] md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Legal</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">
          Terms & conditions
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted md:text-base">
          These terms explain how orders, accounts, offers, shipping, returns, and website use work at Aura Coffee Roasters. By browsing our store or placing an order, you agree to these terms.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Last updated: July 27, 2026
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/privacy" className="rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary">
            Privacy policy
          </Link>
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-primary-dark">
            Contact
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Using the site</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            You agree to provide accurate information, keep your login details secure, and use the website only for lawful personal shopping. You may not disrupt the site, misuse coupons, scrape content, or attempt unauthorized access.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Orders</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Orders are confirmed after successful checkout. Product availability, prices, taxes, shipping fees, and estimated delivery timelines are shown before payment. We may contact you for address corrections, stock changes, or payment verification.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Product freshness</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Coffee, tea, spices, and food products should be stored as directed on the product page or packaging. Flavor notes, grind suitability, and brewing results can vary based on water, equipment, storage, and preparation.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Shipping and delivery</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Delivery dates are estimates and may change because of courier delays, weather, inventory, holidays, or incorrect address details. Risk of loss transfers according to the courier confirmation for the delivery address provided.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Returns and refunds</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            If an item arrives damaged, missing, or incorrect, contact us with your order code and photos where applicable. Refunds or replacements are reviewed based on product condition, courier confirmation, and our shipping policy.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Offers and accounts</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Discounts, loyalty benefits, and subscriptions may have limits, expiry dates, and product exclusions. We may suspend benefits or accounts if we detect fraud, abuse, or repeated policy violations.
          </p>
        </article>
      </section>
    </main>
  );
}
