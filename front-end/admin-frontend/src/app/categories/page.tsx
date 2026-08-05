"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, X, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  createCategory,
  deleteCategory,
  getCategories,
  type AdminCategoryRecord,
  uploadCategoryImage,
  updateCategory,
} from "@/lib/admin-product-api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategoryRecord[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftCategoryName, setDraftCategoryName] = useState("");
  const [draftCategoryImage, setDraftCategoryImage] = useState("");
  const [draftCategoryImageFile, setDraftCategoryImageFile] = useState<File | null>(null);
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await getCategories();
      setCategories(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategory.trim()) {
      setError("Category name cannot be empty.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const uploadedImage = newCategoryImageFile
        ? await uploadCategoryImage(newCategoryImageFile)
        : "";

      await createCategory({ name: newCategory.trim(), image: uploadedImage });
      setNewCategory("");
      setNewCategoryImageFile(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (category: AdminCategoryRecord) => {
    setEditingCategoryId(category.id);
    setDraftCategoryName(category.name);
    setDraftCategoryImage(category.image || "");
    setDraftCategoryImageFile(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setDraftCategoryName("");
    setDraftCategoryImage("");
    setDraftCategoryImageFile(null);
  };

  const handleSaveCategory = async (categoryId: string) => {
    if (!draftCategoryName.trim()) {
      setError("Category name cannot be empty.");
      return;
    }

    setRowLoadingId(categoryId);
    setError(null);

    try {
      const uploadedImage = draftCategoryImageFile
        ? await uploadCategoryImage(draftCategoryImageFile)
        : draftCategoryImage.trim();

      await updateCategory(categoryId, {
        name: draftCategoryName.trim(),
        image: uploadedImage,
      });
      await loadCategories();
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save category.");
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleToggleActive = async (category: AdminCategoryRecord) => {
    setActiveChangeId(category.id);
    setError(null);

    try {
      await updateCategory(category.id, { active: !category.active });
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update category status.");
    } finally {
      setActiveChangeId(null);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const confirmed = window.confirm("Delete this category? This cannot be undone.");
    if (!confirmed) return;

    setRowLoadingId(categoryId);
    setError(null);

    try {
      await deleteCategory(categoryId);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete category.");
    } finally {
      setRowLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Category management"
        description="Create and review product categories that power the catalog and storefront filters."
        badge="Catalog"
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <AdminCard>
          <p className="text-sm text-muted">Total categories</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground">{categories.length}</p>
          <p className="mt-4 text-sm leading-6 text-muted">
            Categories created here are available in the admin product form and in the storefront category filters.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.slice(0, 3).map((category) => (
              <div
                key={`summary-${category.id}`}
                className="rounded-[1.4rem] border border-black/6 bg-white/80 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/8 bg-background">
                    {category.image ? (
                      <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">No image</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                      {category.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="New category" eyebrow="Add category">
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Category name</span>
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Single origin, Espresso, Decaf..."
                className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Category image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setNewCategoryImageFile(file);
                }}
                className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {newCategoryImageFile ? (
              <p className="text-xs text-muted">Selected: {newCategoryImageFile.name}</p>
            ) : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-950 px-6 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {submitting ? "Saving…" : "Create category"}
            </button>
          </form>
        </AdminCard>
      </div>

      <AdminCard title="Categories" eyebrow="Category list">
        <div className="overflow-hidden rounded-[1.5rem] border border-black/6">
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full divide-y divide-black/6 text-left">
              <thead className="bg-background">
                <tr className="text-xs uppercase tracking-[0.16em] text-muted">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Image</th>
                  <th className="px-4 py-3 font-bold">Identifier</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 bg-white">
                {categories.map((category) => {
                  const isEditing = editingCategoryId === category.id;
                  const isBusy = rowLoadingId === category.id || activeChangeId === category.id;

                  return (
                    <tr key={category.id}>
                      <td className="px-4 py-4 align-top text-sm text-foreground">
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              value={draftCategoryName}
                              onChange={(event) => setDraftCategoryName(event.target.value)}
                              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{category.name}</p>
                            <p className="break-all text-xs text-muted">{category.id}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted">
                        <div className="flex min-w-[190px] items-start gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-black/10 bg-background">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                                No image
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            {isEditing ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] || null;
                                    setDraftCategoryImageFile(file);
                                  }}
                                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                                />
                                {draftCategoryImageFile ? (
                                  <p className="text-xs text-muted">Selected: {draftCategoryImageFile.name}</p>
                                ) : draftCategoryImage ? (
                                  <p className="text-xs text-muted">Current image kept unless you upload a new one.</p>
                                ) : (
                                  <p className="text-xs text-muted">Upload an image to show it in storefront category filters.</p>
                                )}
                              </>
                            ) : category.image ? (
                              <a
                                href={category.image}
                                target="_blank"
                                rel="noreferrer"
                                className="block break-all text-xs text-muted transition hover:text-emerald-900"
                              >
                                {category.image}
                              </a>
                            ) : (
                              <p className="text-xs text-muted">This category has no visual assigned yet.</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted">
                        <span className="break-all">{category.id}</span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            category.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {category.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <div className="flex min-w-[180px] flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleSaveCategory(category.id)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full bg-emerald-950 p-2 text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                                title="Save"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Cancel"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(category)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-emerald-900 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(category)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white p-2 text-foreground transition hover:border-emerald-900 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title={category.active ? "Deactivate" : "Activate"}
                              >
                                {category.active ? (
                                  <Eye className="h-5 w-5" />
                                ) : (
                                  <EyeOff className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category.id)}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 hover:text-rose-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                      No categories have been created yet. Add a category to get started.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
