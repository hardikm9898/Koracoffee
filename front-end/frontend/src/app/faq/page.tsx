import Link from "next/link";

const FAQS = [
  {
    q: "Where do you ship?",
    a: "We ship to most regions supported by our courier partners. During checkout you’ll see available serviceability and delivery estimates.",
  },
  {
    q: "How fresh is the coffee?",
    a: "We roast in small batches and aim to ship quickly. For best flavor, rest beans 3–7 days after roast and store airtight away from heat.",
  },
  {
    q: "Can I edit or cancel an order?",
    a: "If your order hasn’t moved to fulfillment yet, we can usually help. Reach out with your order code as soon as possible.",
  },
  {
    q: "Do you offer returns?",
    a: "If something arrives damaged or incorrect, we’ll make it right. See Shipping & Returns for the full policy and steps.",
  },
  {
    q: "How do subscriptions work?",
    a: "Choose a plan, set frequency, and we’ll deliver on schedule. You can manage pauses and changes from your profile page.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 md:px-12 md:py-16">
      <div className="rounded-[2.2rem] border border-black/6 bg-coffee-light/20 p-8 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Support</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">
          Quick answers about shipping, freshness, orders, and subscriptions. If you still need help, contact us anytime.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-primary-dark">
            Contact support
          </Link>
          <Link href="/shipping" className="rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary">
            Shipping & returns
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {FAQS.map((item) => (
          <article key={item.q} className="rounded-[1.8rem] border border-black/6 bg-background p-6">
            <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{item.q}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{item.a}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

