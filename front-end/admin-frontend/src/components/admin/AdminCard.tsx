import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Flags a panel as static/hardcoded content rather than backend data —
// added because several dashboard panels ("Priority tasks", "Segment
// notes", the hardcoded "Activity feed") were previously styled
// identically to the real, API-driven panels next to them, with no way to
// tell them apart. Use on any AdminCard's `badge` prop wherever the
// content isn't actually live.
export const SampleDataBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
    <Info className="h-3 w-3" /> Sample data
  </span>
);

type AdminCardProps = {
  title?: string;
  eyebrow?: string;
  // Rendered inline next to the title — currently only used to flag panels
  // showing hardcoded/sample data (see app/page.tsx's "Priority tasks",
  // "Segment notes", "Activity feed") so they're not mistaken for the real,
  // backend-driven panels sitting right next to them.
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export default function AdminCard({ title, eyebrow, badge, className, children }: AdminCardProps) {
  return (
    <section
      className={cn(
        "admin-surface rounded-[1.8rem] p-5 sm:p-6",
        className,
      )}
    >
      {(eyebrow || title || badge) && (
        <header className="mb-5">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          {(title || badge) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {title && <h3 className="text-xl font-bold tracking-[-0.03em] text-foreground">{title}</h3>}
              {badge}
            </div>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
