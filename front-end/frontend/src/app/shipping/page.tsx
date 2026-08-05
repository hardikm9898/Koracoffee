import Link from "next/link";

export default function ShippingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 md:px-12 md:py-16">
      <div className="rounded-[2.2rem] border border-black/6 bg-coffee-light/20 p-8 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Policy</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">
          Shipping & returns
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">
          Clear expectations, fast resolutions. If something’s off with your delivery, we’ll help you fix it quickly.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-primary-dark">
            Contact us
          </Link>
          <Link href="/faq" className="rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary">
            FAQ
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-4">
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6">
          <h2 className="text-lg font-bold text-foreground">Dispatch timeline</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Orders are typically processed within 24–48 hours. Delivery timelines vary by location and courier availability.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6">
          <h2 className="text-lg font-bold text-foreground">Shipping fees</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Shipping charges (if applicable) are shown at checkout before payment. Promotions may offer free shipping on eligible carts.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6">
          <h2 className="text-lg font-bold text-foreground">Returns & issues</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            If you receive a damaged item, wrong product, or missing items, contact us with your order code and photos (if relevant).
            We’ll arrange a replacement or resolution as quickly as possible.
          </p>
        </article>
      </section>
    </main>
  );
}

