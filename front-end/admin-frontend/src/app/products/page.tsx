"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { cn } from "@/lib/utils";
import { deleteProduct, getProducts, type AdminProductRecord } from "@/lib/admin-product-api";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "best-selling", label: "Best selling" },
  { value: "name-asc", label: "Name A→Z" },
  { value: "name-desc", label: "Name Z→A" },
  { value: "price-asc", label: "Price low→high" },
  { value: "price-desc", label: "Price high→low" },
  { value: "date-new", label: "Newest" },
  { value: "date-old", label: "Oldest" },
];

export default function ProductsPage() {
  const [items, setItems] = useState<AdminProductRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [inStock, setInStock] = useState("all");
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getProducts({
        category: category === "All" ? undefined : category,
        search: search.trim() || undefined,
        inStock: inStock === "all" ? undefined : inStock === "true",
        sort,
        page: 1,
        limit: 50,
      });

      setItems(response.items);
      setCategories(response.filters.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [category, inStock, search, sort]);

  const summary = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((item) => !item.inStock).length;
    const featured = items.filter((item) => item.featured).length;

    return { total, lowStock, featured };
  }, [items]);

  const handleDelete = async (productId: number) => {
    if (!window.confirm("Delete this product permanently?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteProduct(productId);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Catalog and inventory"
        description="Manage the same product dataset used by the storefront. Add new products, filter by category, and keep catalog records synchronized."
        badge="Catalog"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search by product name, origin, or notes"
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Products</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Out of stock</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.lowStock}</p>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Featured</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.featured}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/products/bulk-upload"
              className="rounded-full border border-emerald-950/20 bg-white px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:border-emerald-950 hover:bg-emerald-50"
            >
              Bulk upload
            </Link>
            <Link href="/products/new" className="rounded-full bg-emerald-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900">
              Add product
            </Link>
          </div>
        </div>
      </div>

      <section className="admin-surface rounded-3xl p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-900">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="All">All</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-900">Stock</span>
            <select
              value={inStock}
              onChange={(event) => setInStock(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">All</option>
              <option value="true">In stock</option>
              <option value="false">Out of stock</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-900">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="admin-surface rounded-3xl p-4">
        <div className="admin-table-wrap">
          <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Featured</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No products match the filter. Adjust search or add a new product.
                  </td>
                </tr>
              ) : (
                items.map((product) => (
                  <tr key={product.id} className={cn(!product.inStock && "bg-rose-50/40")}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">#{product.id}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{product.category}</td>
                    <td className="px-4 py-4 text-slate-700">₹{product.basePrice.toFixed(2)}</td>
                    <td className="px-4 py-4 text-slate-700">{product.inStock ? "In stock" : "Out"}</td>
                    <td className="px-4 py-4 text-slate-700">{product.featured ? "Yes" : "No"}</td>
                    <td className="px-4 py-4 text-slate-700">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/products/${product.id}`} className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900" title="View">
                          <Eye className="h-5 w-5" />
                        </Link>
                        <Link href={`/products/${product.id}/edit`} className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900" title="Edit">
                          <Pencil className="h-5 w-5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(product.id)}
                          className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
