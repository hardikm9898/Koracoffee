import Link from "next/link";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import ProductForm from "@/components/admin/ProductForm";
import { getProductById } from "@/lib/admin-product-api";

type EditProductPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminTopbar
        title={`Edit ${product.name}`}
        description="Make changes to the shared product schema used by the storefront and admin experience."
        badge="Edit product"
      />
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">Editing the record used by both the storefront and admin panel.</p>
          <Link href={`/products/${product.id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900">
            View product
          </Link>
        </div>
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
