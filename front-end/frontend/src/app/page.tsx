import { ArrowRight, Coffee, Package, Leaf, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

import ImageBannerSlider from "@/components/home/ImageBannerSlider";
import FloatingCups from "@/components/home/FloatingCups";
import ScrollAnimation from "@/components/home/ScrollAnimation";
import DeferredVideo from "@/components/home/DeferredVideo";
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

const CategoryMenu = ({ categories }: { categories: CategoryRecord[] }) => {
  return (
    <section className="pt-6 pb-12 md:pt-8 md:pb-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-8 pb-4 pt-6 scrollbar-hide snap-x snap-mandatory justify-start md:justify-center items-center">
          {categories.map((cat, i) => (
            <Link
              key={i}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center gap-6 group min-w-[110px] snap-center transition-all duration-700"
            >
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border border-black/5 group-hover:border-primary/20 transition-all duration-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-[0_20px_50px_rgba(178,124,78,0.15)] group-hover:-translate-y-3 bg-white">
                <img
                  src={cat.image || fallbackCategoryImage(cat.name)}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-700" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] md:text-xs font-bold text-muted group-hover:text-primary transition-all duration-500 text-center uppercase tracking-[0.25em]">
                  {cat.name}
                </span>
                <div className="w-0 h-[1.5px] bg-primary group-hover:w-8 transition-all duration-500 rounded-full" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Professional Image Banners - Flush with Header (Blue Tokai Standard) */}
      <ImageBannerSlider />

      {/* Round Menu Categories */}
      <CategoryMenu categories={featuredCategories} />

      {/* Scroll Indicator */}
      <ScrollAnimation animationType="bounce" className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-muted">
         {/* Could put an icon here if needed */}
      </ScrollAnimation>

      {/* New Arrivals Section */}
      <section id="arrivals" className="py-10 lg:py-16 px-6 md:px-12 bg-coffee-light/30 relative z-20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
            <ScrollAnimation animationType="fade-right" viewportMargin="-100px">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">New <span className="gradient-text italic">Arrivals</span></h2>
              <p className="text-muted max-w-xl">Fresh off the harvest. Discover our latest limited-edition micro-lots and seasonal blends.</p>
            </ScrollAnimation>

            <ScrollAnimation animationType="fade-left" viewportMargin="-100px">
              <Link href="/shop" className="group flex items-center gap-2 text-primary font-bold hover:text-foreground transition-colors">
                View All Products <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </ScrollAnimation>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newArrivals.map((product, index) => (
              <ScrollAnimation
                key={product.id}
                delay={index * 0.1}
                className="group cursor-pointer"
              >
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
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section id="categories" className="py-10 lg:py-16 px-6 md:px-12 bg-background relative z-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-coffee-medium/5 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto">
          <ScrollAnimation
            viewportMargin="-100px"
            className="text-center mb-20 relative"
          >
            {/* Abundant Decorative Small Cups */}
            <FloatingCups />

            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground relative z-10">Test The <span className="gradient-text italic">Magic</span></h2>
            <p className="text-muted max-w-2xl mx-auto relative z-10">Beyond exceptional coffee, discover our curated selection of rare teas, artisanal dry fruits, and ethically sourced spices.</p>
          </ScrollAnimation>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCategories.slice(0, 4).map((category, index) => (
              <ScrollAnimation
                key={category.id}
                delay={index * 0.2}
                className="group relative"
              >
                <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className="block h-full">
                  <div className={cn(
                    "h-full p-8 rounded-3xl glass border border-white/5 relative overflow-hidden flex flex-col items-start text-left transition-all duration-500",
                    "hover:shadow-[0_0_40px_rgba(178,124,78,0.05)] hover:border-black/10"
                  )}>
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={category.image || fallbackCategoryImage(category.name)}
                        alt={category.name}
                        className="h-full w-full object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 w-full">
                      <div className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors border border-black/5 group-hover:border-primary/30 group-hover:scale-110 duration-500">
                        {index % 4 === 0 ? (
                          <Coffee className="w-6 h-6 text-primary transition-colors" />
                        ) : index % 4 === 1 ? (
                          <Leaf className="w-6 h-6 text-primary transition-colors" />
                        ) : index % 4 === 2 ? (
                          <Star className="w-6 h-6 text-primary transition-colors" />
                        ) : (
                          <Package className="w-6 h-6 text-primary transition-colors" />
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors text-foreground">{category.name}</h3>
                      <p className="text-muted text-sm leading-relaxed mb-8 group-hover:text-foreground transition-colors">
                        Explore the {category.name} collection from the same category records managed in the admin panel.
                      </p>

                      <div className="mt-auto flex items-center text-sm font-bold text-primary transition-colors gap-2">
                        Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Banner Section */}
      <section id="story" className="py-10 lg:py-16 px-6 md:px-12 relative z-20">
        <div className="container mx-auto">
          <ScrollAnimation
            animationType="scale-up"
            className="rounded-[2.5rem] overflow-hidden relative glass border-primary/10 bg-gradient-to-r from-coffee-light/50 to-white shadow-xl shadow-primary/5"
          >
            {/* Wavy/Futuristic Abstract Pattern Background */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,50 Q25,20 50,50 T100,50 L100,100 L0,100 Z" fill="url(#grad1)" />
                <path d="M0,70 Q25,40 50,70 T100,70 L100,100 L0,100 Z" fill="url(#grad2)" opacity="0.5" />
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C69C6D" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#F5EBE1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C69C6D" stopOpacity="1" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 p-8 md:p-16">
              <div className="w-full lg:w-1/2 space-y-8">
                <h3 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                  Press your way to a rich, <span className="gradient-text italic">flavourful</span>, & full-bodied brew!
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold tracking-widest text-primary uppercase">
                  <span>EASY-TO-USE</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>TRAVEL-FRIENDLY</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>VERSATILE</span>
                </div>

                <div className="glass px-6 py-4 rounded-xl border border-primary/10 bg-white/40 inline-block">
                  <p className="text-foreground text-sm md:text-base font-medium">
                    ENJOY FLAT <span className="text-primary font-bold">50% OFF</span> ON A BRAND-NEW FRENCH PRESS<br />WHEN YOU ORDER ROASTED COFFEE.
                  </p>
                </div>

                <button className="bg-primary text-white px-10 py-4 rounded-xl font-bold hover:bg-foreground hover:text-white transition-all duration-300 shadow-[0_0_30px_rgba(178,124,78,0.3)] hover:shadow-[0_0_50px_rgba(0,0,0,0.1)] uppercase tracking-wide">
                  Buy Now
                </button>
              </div>

              <div className="w-full lg:w-1/2 relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden glass border-black/5 flex items-center justify-center group">
                <div className="absolute inset-0">
                  <Image
                    src="/promo/french-press.png"
                    alt="French Press"
                    fill
                    className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-black/80 to-transparent" />
                {/* Stylized French Press Representation Backup */}
                <Coffee className="w-32 h-32 md:w-48 md:h-48 text-primary opacity-80 animate-pulse-slow relative z-10" />
                <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay">
                  <div className="w-64 h-64 border border-black/5 rounded-full animate-[spin_20s_linear_infinite]" />
                </div>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Preparation Guides Section */}
      <section id="brew" className="py-10 lg:py-16 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <ScrollAnimation
              animationType="fade-right"
              className="w-full lg:w-1/2 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary font-medium text-sm mb-4">
                <Coffee className="w-4 h-4" /> Brew Like a Pro
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Master the <span className="gradient-text italic">Craft</span>
              </h2>
              <p className="text-lg text-muted leading-relaxed">
                Unlock the full potential of your beans, leaves, and spices. Our interactive guides walk you through precise measurements, timings, and techniques for the perfect extraction every time.
              </p>

              <div className="pt-8 space-y-4">
                {[
                  { title: "Pour Over (V60)", time: "3:00 Min", difficulty: "Medium", icon: Coffee },
                  { title: "Traditional Matcha", time: "1:30 Min", difficulty: "Hard", icon: Leaf },
                  { title: "Golden Saffron Milk", time: "5:00 Min", difficulty: "Easy", icon: Star }
                ].map((guide, i) => (
                  <ScrollAnimation
                    key={i}
                    delay={0.2 + (i * 0.1)}
                    className="glass p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:border-primary/30 transition-all border border-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-sm">
                        <guide.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{guide.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted font-medium mt-1">
                          <span>⏱️ {guide.time}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>Level: {guide.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                  </ScrollAnimation>
                ))}
              </div>
            </ScrollAnimation>

            <ScrollAnimation
              animationType="scale-up"
              className="w-full lg:w-1/2 relative h-[500px]"
            >
              <div className="absolute inset-0 rounded-3xl overflow-hidden glass border-primary/20 shadow-xl shadow-primary/5 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-coffee-dark/80 to-primary/10 animate-pulse-slow" />

                {/* Aesthetic Coffee Video - Defer loading using our wrapper */}
                <DeferredVideo poster="/videos/brewing-poster.png" src="/videos/brewing-ritual.mp4" />

                {/* Subtle Overlays for Depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-coffee-dark/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10" />

                {/* Decorative Elements */}
                <div className="relative z-20 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md bg-white/5 mb-4 animate-[bounce_4s_infinite]">
                    <Coffee className="w-8 h-8 text-primary shadow-glow" />
                  </div>
                  <p className="text-white font-bold tracking-widest uppercase text-xs">Aura Brewing Ritual</p>
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* Subscription Banner */}
      <section id="club" className="py-10 lg:py-16 px-6 md:px-12 relative z-20">
        <div className="container mx-auto">
          <ScrollAnimation
            className="rounded-3xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-coffee-medium z-0" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 z-0" />

            <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-2xl">
                <h3 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">Never Run Out of <span className="italic">Magic</span></h3>
                <p className="text-foreground/80 text-lg mb-8">
                  Join the Aura Club. Get freshly roasted beans delivered to your door every month. Save 15% and unlock exclusive micro-lots.
                </p>
                <button className="bg-white text-primary px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-2xl flex items-center gap-2 group">
                  Start Subscription <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative">
                <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse blur-xl" />
                <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
                  <span className="text-5xl font-bold">15%</span>
                  <span className="text-xl mt-1 font-bold">OFF</span>
                </div>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-10 lg:py-16 relative overflow-hidden bg-coffee-light/15">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

        <div className="container mx-auto px-6 md:px-12 relative z-10 flex flex-col items-center">
          <ScrollAnimation
            animationType="scale-up"
            className="glass rounded-3xl p-10 md:p-16 max-w-4xl w-full text-center border-primary/20 bg-white/40"
          >
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-6 h-6 fill-primary text-primary" />)}
            </div>
            <h3 className="text-2xl md:text-4xl font-medium leading-relaxed mb-8 italic text-foreground">
              &quot;Aura Coffee didn&apos;t just meet my expectations; they redefined what I thought coffee could taste like. The shipping was fast, the unboxing experience was premium, and the taste is truly next-level.&quot;
            </h3>
            <div>
              <p className="text-primary font-bold text-lg">Eleanor V.</p>
              <p className="text-muted text-sm">Verified Buyer</p>
            </div>
          </ScrollAnimation>
        </div>
      </section>
    </div>
  );
}
