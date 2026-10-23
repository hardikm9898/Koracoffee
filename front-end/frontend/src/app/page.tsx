import { ArrowRight, Coffee, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Fragment } from "react";

import CoffeeStory from "@/components/home/CoffeeStory";
import CategoryRail from "@/components/home/CategoryRail";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { TextReveal } from "@/components/motion/TextReveal";
import { getCategories, getProducts, type CategoryRecord } from "@/lib/product-api";

const fallbackCategoryImage = (name: string) => {
  const normalized = String(name).trim().toLowerCase();

  switch (normalized) {
    case "coffee":
      return "/categories/coffee.png";
    case "tea":
      return "/categories/tea.png";
    case "spices":
      return "/categories/spices.png";
    case "dryfruit":
    case "dry fruit":
      return "/categories/dryfruit.png";
    case "offers":
      return "/categories/offers.png";
    default:
      return "/categories/coffee.png";
  }
};

export default async function Home() {
  const [arrivalsResponse, categoriesResponse] = await Promise.all([
    getProducts({
      page: 1,
      limit: 3,
      sort: "date-new",
    }).catch(() => ({
      items: [],
      filters: { categories: [] },
      pagination: { page: 1, limit: 3, total: 0, totalPages: 0, hasNextPage: false },
    })),
    getCategories().catch(() => [] as CategoryRecord[]),
  ]);

  const newArrivals = arrivalsResponse.items;
  const activeCategories = categoriesResponse.filter((category) => category.active);
  const featuredCategories = activeCategories.length > 0
    ? activeCategories.slice(0, 5)
    : [
        { id: "coffee", name: "Coffee", image: "/categories/coffee.png", active: true },
        { id: "tea", name: "Tea", image: "/categories/tea.png", active: true },
        { id: "spices", name: "Spices", image: "/categories/spices.png", active: true },
        { id: "dryfruit", name: "Dryfruit", image: "/categories/dryfruit.png", active: true },
        { id: "offers", name: "Offers", image: "/categories/offers.png", active: true },
      ];
  const railCategories = featuredCategories.map((category) => ({
    id: String(category.id),
    name: category.name,
    image: category.image || fallbackCategoryImage(category.name),
  }));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero — pinned scroll story: the coffee is made as you scroll */}
      <CoffeeStory />

      {/* New Arrivals — text reveal heading + staggered cards */}
      <section id="arrivals" className="py-20 lg:py-28 px-6 md:px-12 bg-background relative z-20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-6">
            <div className="text-center md:text-left">
              <TextReveal
                className="text-4xl md:text-5xl font-bold mb-4 text-foreground"
                lines={[<Fragment key="arrivals">New <span className="gradient-text italic">Arrivals</span></Fragment>]}
              />
              <Reveal delay={0.15}>
                <p className="text-muted max-w-xl">Fresh off the harvest. Discover our latest limited-edition micro-lots and seasonal blends.</p>
              </Reveal>
            </div>

            <Reveal direction="left" delay={0.2}>
              <Link href="/shop" className="group flex items-center gap-2 text-primary font-bold hover:text-foreground transition-colors">
                View All Products <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Reveal>
          </div>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" stagger={0.15}>
            {newArrivals.map((product) => (
              <StaggerItem key={product.id} distance={60} className="group cursor-pointer">
                <Link href={`/shop/${product.id}`} className="block h-full">
                  <div className="h-64 bg-coffee-medium/10 relative flex items-center justify-center overflow-hidden rounded-sm">
                    {(product.images?.[0] ?? product.image) ? (
                      <Image
                        src={product.images?.[0] ?? product.image!}
                        alt={product.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110 z-0"
                      />
                    ) : (
                      <Coffee className="w-20 h-20 text-primary/30 z-0" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10" />
                    {/* Dynamic glow based on category */}
                    <div className={cn(
                      "absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500",
                      product.category === "Coffee" ? "bg-[#8B5A2B]" : product.category === "Tea" ? "bg-[#4CAF50]" : "bg-[#FF9800]"
                    )} />
                    <div className="absolute top-4 left-4 z-20 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] uppercase font-bold text-primary border border-primary/20">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors text-foreground">{product.name}</h3>
                      <span className="font-bold text-lg text-primary">₹{product.basePrice.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-muted mb-4 line-clamp-2">{product.notes}</p>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="text-sm font-bold">{product.rating}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* The collection — horizontal scroll (pinned on desktop) */}
      <CategoryRail categories={railCategories} />
    </div>
  );
}
