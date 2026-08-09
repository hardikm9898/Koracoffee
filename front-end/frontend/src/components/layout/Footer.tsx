import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-coffee-light/30 border-t border-black/5 pt-16 pb-8 px-6 md:px-12 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-1">
          <div className="mb-4 flex items-center gap-2.5">
            <Image
              src="/logo/koura-mark.png"
              alt="Koura Coffee"
              width={116}
              height={110}
              className="h-9 w-auto object-contain"
            />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-[0.06em] text-foreground">KOURA</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary">Coffee</span>
            </span>
          </div>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Pioneering the future of coffee. Sustainably sourced, expertly roasted, delivering an unparalleled sensory experience.
          </p>
          <div className="space-y-2 text-sm text-muted mb-6">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Shop-104, FF Sun Way Residency, Opp. Shaj Residency, Nr. Nikol Lake, Nikol, Ahmedabad-382360</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a href="mailto:infokouracoffee@gmail.com" className="hover:text-primary transition-colors">infokouracoffee@gmail.com</a>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <a href="tel:+919687761747" className="hover:text-primary transition-colors">+91 96877 61747</a>
            </p>
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-muted hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="text-muted hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="text-muted hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-4 text-foreground">Shop</h4>
          <ul className="space-y-3 text-sm text-muted">
            <li><Link href="/shop" className="hover:text-primary transition-colors">All Coffee</Link></li>
            <li><Link href="/shop/espresso" className="hover:text-primary transition-colors">Espresso Blends</Link></li>
            <li><Link href="/shop/single-origin" className="hover:text-primary transition-colors">Single Origin</Link></li>
            <li><Link href="/shop/equipment" className="hover:text-primary transition-colors">Equipment</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-4 text-foreground">Support</h4>
          <ul className="space-y-3 text-sm text-muted">
            <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link href="/shipping" className="hover:text-primary transition-colors">Shipping & Returns</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-4 text-foreground">Newsletter</h4>
          <p className="text-muted text-sm mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
          <form className="flex">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-background text-foreground px-4 py-2 w-full focus:outline-none focus:ring-1 focus:ring-primary h-10 rounded-l-md border border-black/5"
            />
            <button className="bg-primary hover:bg-primary-dark transition-colors text-white px-4 py-2 font-medium h-10 rounded-r-md">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted">
        <p>&copy; 2030 Koura Coffee Roasters. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
