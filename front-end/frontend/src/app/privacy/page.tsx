import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page-shell mx-auto w-full max-w-5xl px-6 md:px-12">
      <div className="rounded-[2.2rem] border border-black/6 bg-coffee-light/20 p-8 shadow-[0_22px_60px_rgba(42,28,22,0.08)] md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Legal</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">
          Privacy policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted md:text-base">
          At Aura Coffee Roasters, privacy is treated with the same care as sourcing, roasting, and packing your order. This policy explains what we collect, why we collect it, and how we protect your information when you shop coffee, tea, spices, dry fruits, or gift products with us.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Last updated: July 27, 2026
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/terms" className="rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-primary/30 hover:text-primary">
            Terms & conditions
          </Link>
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-primary-dark">
            Contact
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Information we collect</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            We may collect your name, email, phone number, delivery address, billing details, saved addresses, account preferences, cart activity, order history, and messages you send to support. We also collect basic device and site usage data to keep the store reliable.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">How we use data</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            We use your information to process payments, prepare and ship orders, send order updates, manage returns, answer support requests, prevent fraud, personalize product suggestions, and improve the shopping experience.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Payments and security</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Payment information is handled through secure payment partners. We do not intentionally store full card numbers on our website. We use reasonable safeguards to protect account, order, and delivery information.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Sharing information</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            We share only what is needed with trusted partners such as payment processors, delivery providers, analytics tools, and support services. We do not sell your personal information.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Cookies and preferences</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Cookies and local storage help keep you signed in, remember your cart, understand product interest, and improve performance. You can control cookies through your browser settings.
          </p>
        </article>
        <article className="rounded-[1.8rem] border border-black/6 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Your choices</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            You can request access, correction, or deletion of eligible personal information by contacting us. Some order records may be retained where required for accounting, security, or legal reasons.
          </p>
        </article>
      </section>
    </main>
  );
}
