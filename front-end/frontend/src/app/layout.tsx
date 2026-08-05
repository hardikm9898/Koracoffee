import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AppProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "Aura Coffee | Premium Roasters",
  description: "Experience the ultimate coffee journey. Premium beans, expert roasting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-background text-foreground"
      >
        <AppProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
