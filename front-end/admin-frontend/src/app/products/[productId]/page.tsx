import Link from "next/link";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getProductById } from "@/lib/admin-product-api";

type ProductDetailProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <div className="space-y-6">
      <AdminTopbar
        title={product.name}
        description={`View the complete product record for ${product.category}.`}
        badge="Product detail"
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Catalog overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{product.name}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900">
              Back to products
            </Link>
            <Link href={`/products/${product.id}/edit`} className="rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900">
              Edit product
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Product gallery</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Images used in the storefront product cards and detail page.
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {productImages.length} image{productImages.length === 1 ? "" : "s"}
                </p>
              </div>

              {productImages.length > 0 ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                    <img
                      src={productImages[0]}
                      alt={product.name}
                      className="h-full max-h-[420px] w-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                    {productImages.map((url, index) => (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"
                      >
                        <img
                          src={url}
                          alt={`${product.name} ${index + 1}`}
                          className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                  No product images have been added yet.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Storefront content</p>
              <div className="space-y-6 pt-4 text-sm text-slate-700">
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-2 leading-7">{product.description}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="mt-2 leading-7">{product.notes}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Image URLs</p>
                  <div className="mt-2 space-y-2 text-sm">
                    {productImages.map((url, index) => (
                      <p key={`${url}-${index}`} className="break-all">
                        {url}
                      </p>
                    ))}
                    {productImages.length === 0 ? (
                      <p>No image URL provided</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing & availability</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-slate-500">Base price</p>
                  <p className="mt-2 font-semibold text-slate-900">₹{product.basePrice.toFixed(2)}</p>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-slate-500">Original price</p>
                  <p className="mt-2 font-semibold text-slate-900">{product.originalPrice ? `₹${product.originalPrice.toFixed(2)}` : "None"}</p>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-slate-500">Stock status</p>
                  <p className="mt-2 font-semibold text-slate-900">{product.inStock ? "In stock" : "Out of stock"}</p>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-slate-500">Rating</p>
                  <p className="mt-2 font-semibold text-slate-900">{product.rating.toFixed(1)} / 5</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Origin</p>
                <p className="mt-4"><span className="font-semibold">Origin:</span> {product.origin}</p>
                <p className="mt-2"><span className="font-semibold">Altitude:</span> {product.altitude || "—"}</p>
                <p className="mt-2"><span className="font-semibold">Process:</span> {product.process || "—"}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Flavor profile</p>
                <p className="mt-4"><span className="font-semibold">Acidity:</span> {product.stats.acidity}</p>
                <p className="mt-2"><span className="font-semibold">Body:</span> {product.stats.body}</p>
                <p className="mt-2"><span className="font-semibold">Sweetness:</span> {product.stats.sweetness}</p>
                <p className="mt-2"><span className="font-semibold">Complexity:</span> {product.stats.complexity}</p>
                <p className="mt-2"><span className="font-semibold">Finish:</span> {product.stats.finish}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Serve guide</p>
                <p className="mt-4"><span className="font-semibold">Vessel:</span> {product.serve.vessel || "—"}</p>
                <p className="mt-2"><span className="font-semibold">Grind:</span> {product.serve.grind || "—"}</p>
                <p className="mt-2"><span className="font-semibold">Temperature:</span> {product.serve.temp || "—"}</p>
                <p className="mt-2"><span className="font-semibold">Time:</span> {product.serve.time || "—"}</p>
              </div>
            </section>
          </div>

          <aside className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
            <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Record details</p>
            <div className="space-y-3">
              <p><span className="font-semibold">Product id:</span> {product.id}</p>
              <p><span className="font-semibold">Category:</span> {product.category}</p>
              <p><span className="font-semibold">Featured:</span> {product.featured ? "Yes" : "No"}</p>
              <p><span className="font-semibold">Created:</span> {product.createdAt ? new Date(product.createdAt).toLocaleString() : "Unknown"}</p>
              <p><span className="font-semibold">Last updated:</span> {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "Unknown"}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
