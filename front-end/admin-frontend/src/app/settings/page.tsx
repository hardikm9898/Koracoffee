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
