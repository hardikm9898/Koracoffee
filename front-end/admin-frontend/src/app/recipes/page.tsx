"use client";

import { FormEvent, useEffect, useState } from "react";
import { PlusCircle, Trash2, EyeOff, Eye } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { createRecipe, deleteRecipe, getRecipes, updateRecipe, type AdminRecipe } from "@/lib/admin-recipe-api";
import { getInventoryItems, type AdminInventoryItem } from "@/lib/admin-inventory-api";
import { getProducts, type AdminProductListItem } from "@/lib/admin-product-api";

type DraftComponent = { itemId: string; quantity: string };

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [variant, setVariant] = useState("");
  const [components, setComponents] = useState<DraftComponent[]>([{ itemId: "", quantity: "" }]);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recipesRes, productsRes, itemsRes] = await Promise.all([
        getRecipes(),
        getProducts({ limit: 200 }),
        getInventoryItems({ active: true, limit: 200 }),
      ]);
      setRecipes(recipesRes);
      setProducts(productsRes.items);
      setItems(itemsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load recipes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId) {
      setError("Select a product.");
      return;
    }
    const validComponents = components.filter((c) => c.itemId && c.quantity);
    if (validComponents.length === 0) {
      setError("Add at least one component.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createRecipe({
        product: Number(productId),
        variant: variant.trim(),
        components: validComponents.map((c) => ({ itemId: Number(c.itemId), quantity: Number(c.quantity) })),
        notes: notes.trim(),
      });
      setProductId("");
      setVariant("");
      setComponents([{ itemId: "", quantity: "" }]);
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (recipe: AdminRecipe) => {
    setRowBusyId(recipe.id);
    setError(null);
    try {
      await updateRecipe(recipe.id, { active: !recipe.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update recipe.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleDelete = async (recipe: AdminRecipe) => {
    if (!window.confirm(`Delete the recipe for ${recipe.productName ?? `product #${recipe.product}`}?`)) return;
    setRowBusyId(recipe.id);
    setError(null);
    try {
      await deleteRecipe(recipe.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete recipe.");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Recipes / BOM"
        description="What raw materials and packaging each product consumes — the bill of materials future order fulfillment will draw from."
        badge="Inventory"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_26rem]">
        <AdminCard title="Recipes" eyebrow="Bill of materials">
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="space-y-3">
            {recipes.map((recipe) => {
              const isBusy = rowBusyId === recipe.id;
              return (
                <div key={recipe.id} className="rounded-[1.5rem] border border-black/6 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {recipe.productName ?? `Product #${recipe.product}`}
                        {recipe.variant ? <span className="text-muted"> · {recipe.variant}</span> : <span className="text-muted"> · all variants</span>}
                      </p>
                      <p className="mt-1 text-xs text-muted">Estimated cost: ${recipe.estimatedCost.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          recipe.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {recipe.active ? "Active" : "Inactive"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(recipe)}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:text-slate-400"
                        title={recipe.active ? "Deactivate" : "Activate"}
                      >
                        {recipe.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(recipe)}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-black/6">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-[0.14em] text-muted">
                        <tr>
                          <th className="px-3 py-2 font-bold">Component</th>
                          <th className="px-3 py-2 font-bold">Qty</th>
                          <th className="px-3 py-2 font-bold">Unit cost</th>
                          <th className="px-3 py-2 font-bold">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/6 bg-white">
                        {recipe.components.map((component, index) => (
                          <tr key={`${recipe.id}-${index}`}>
                            <td className="px-3 py-2">{component.name ?? "—"}</td>
                            <td className="px-3 py-2 text-muted">
                              {component.quantity} {component.unit}
                            </td>
                            <td className="px-3 py-2 text-muted">${component.unitCost.toFixed(2)}</td>
                            <td className="px-3 py-2 font-semibold text-foreground">${component.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {recipes.length === 0 && !loading ? (
              <p className="rounded-[1.5rem] border border-dashed border-black/10 p-8 text-center text-sm text-muted">
                No recipes yet. Define what a product consumes to get cost estimates and (later) automatic order consumption.
              </p>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard title="New recipe" eyebrow="Add BOM">
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Product</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Variant (optional)</span>
              <input
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="Leave blank to apply to all variants"
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Components</span>
              {components.map((component, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={component.itemId}
                    onChange={(e) =>
                      setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, itemId: e.target.value } : c)))
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.itemId}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={component.quantity}
                    onChange={(e) =>
                      setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, quantity: e.target.value } : c)))
                    }
                    className="w-28 shrink-0 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setComponents((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-full border border-rose-200 bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-100"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setComponents((prev) => [...prev, { itemId: "", quantity: "" }])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add component
              </button>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Saving…" : "Create recipe"}
            </button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
