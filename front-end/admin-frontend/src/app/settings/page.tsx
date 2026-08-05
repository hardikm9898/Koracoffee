import { Info } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { settingsGroups } from "@/lib/admin-data";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Operational settings"
        description="Keep commerce rules, customer systems, and access controls organized in one separate admin application."
        badge="Configuration"
      />
      {/* This entire page is a static preview — nothing below is wired to
          a backend, and no control here actually changes anything yet.
          See project-context/known-limitations.md #28. */}
      <div className="flex items-start gap-3 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm leading-6">
          This page is a preview of planned settings — nothing here is connected to the backend yet, and changes
          made here (if any controls are added later) won&apos;t be saved until that&apos;s built.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {settingsGroups.map((group) => (
          <AdminCard key={group.title} title={group.title} eyebrow="Settings group">
            <p className="text-sm leading-6 text-muted">{group.description}</p>
            <div className="mt-5 space-y-3">
              {group.items.map((item) => (
                <div key={item} className="rounded-[1.2rem] border border-black/6 bg-background px-4 py-3">
                  <p className="font-medium text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
