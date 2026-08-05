import type { Metadata } from "next";
import "./globals.css";
import AdminAppShell from "@/components/admin/AdminAppShell";

export const metadata: Metadata = {
  title: "Aura Admin",
  description: "Standalone admin frontend for the Aura store.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdminAppShell>{children}</AdminAppShell>
      </body>
    </html>
  );
}
