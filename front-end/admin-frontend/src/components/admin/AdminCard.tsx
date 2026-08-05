import { cn } from "@/lib/utils";

type AdminCardProps = {
  title?: string;
  eyebrow?: string;
  className?: string;
  children: React.ReactNode;
};

export default function AdminCard({ title, eyebrow, className, children }: AdminCardProps) {
  return (
    <section
      className={cn(
        "admin-surface rounded-[1.8rem] p-5 sm:p-6",
        className,
      )}
    >
      {(eyebrow || title) && (
        <header className="mb-5">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          {title && <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-foreground">{title}</h3>}
        </header>
      )}
      {children}
    </section>
  );
}
