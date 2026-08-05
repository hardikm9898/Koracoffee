"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategoryRecord, AdminProductRecord } from "@/lib/admin-product-api";
import { createProduct, getCategories, updateProduct, uploadProductImages } from "@/lib/admin-product-api";

type ProductFormProps = {
  mode: "create" | "edit";
  product?: AdminProductRecord;
};

const defaultForm = {
  productId: undefined as number | undefined,
  name: "",
  categoryId: "",
  basePrice: "",
  originalPrice: "",
  inStock: true,
  rating: "4.5",
  notes: "",
  description: "",
  origin: "",
  altitude: "",
  process: "",
  image: "",
  featured: false,
  acidity: "3",
  body: "3",
  sweetness: "3",
  complexity: "3",
  finish: "3",
  vessel: "",
  grind: "",
  temp: "",
  time: "",
  variantAttribute: "Variant",
  variants: [] as { label: string; price: string; discountPrice: string; stock: string }[],
};

const normalize = (value: string | number | boolean | undefined) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

export default function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    if (!product) return defaultForm;
    return {
      productId: product.id,
      name: product.name,
      categoryId: product.categoryId ?? "",
      basePrice: String(product.basePrice),
      originalPrice: product.originalPrice !== null && product.originalPrice !== undefined ? String(product.originalPrice) : "",
      inStock: product.inStock,
      rating: String(product.rating),
      notes: product.notes,
      description: product.description,
      origin: product.origin,
      altitude: product.altitude,
      process: product.process,
      image: product.image ?? "",
      featured: product.featured ?? false,
      acidity: String(product.stats.acidity ?? 3),
      body: String(product.stats.body ?? 3),
      sweetness: String(product.stats.sweetness ?? 3),
      complexity: String(product.stats.complexity ?? 3),
      finish: String(product.stats.finish ?? 3),
      vessel: product.serve.vessel,
      grind: product.serve.grind,
      temp: product.serve.temp,
      time: product.serve.time,
      variantAttribute: product.variantAttribute ?? "Variant",
      variants: (product.variants ?? []).map((variant) => ({
        label: variant.label,
        price: String(variant.price),
        discountPrice: variant.discountPrice !== undefined && variant.discountPrice !== null ? String(variant.discountPrice) : "",
        stock: variant.stock !== undefined && variant.stock !== null ? String(variant.stock) : "",
      })),
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminCategoryRecord[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(() => {
    if (!product) return [];
    return product.images && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const items = await getCategories();
        setCategories(items);
      } catch (error) {
        console.error("Failed to load categories", error);
      }
    };

    void loadCategories();
  }, []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateImage = (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return "Only PNG, JPEG, and WEBP images are supported.";
    }
    if (file.size > maxSize) {
      return "Image must be 2MB or smaller.";
    }
    return null;
  };

  const setField = (field: keyof typeof form, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseNumber = (value: string, fallback: number | null = null) => {
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error("Please enter a valid number for numeric fields.");
    }
    return parsed;
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      setImageFiles([]);
      setImagePreviews([]);
      setFileError(null);
      return;
    }

    const acceptedFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        setImageFiles([]);
        setImagePreviews([]);
        setFileError(validationError);
        return;
      }
      acceptedFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setFileError(null);
    setImageFiles(acceptedFiles);
    setImagePreviews(previews);
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await uploadProductImages(imageFiles);
      }

      const imageUrls = [
        ...existingImages,
        ...uploadedUrls,
        ...(form.image.trim() ? [form.image.trim()] : []),
      ].filter(Boolean);

      const basePrice = parseNumber(form.basePrice);
      if (basePrice === null) {
        throw new Error("Base price is required.");
      }

      const payload = {
        id:
          mode === "create" && form.productId !== undefined
            ? form.productId
            : undefined,
        name: form.name.trim(),
        categoryId: form.categoryId,
        basePrice,
        originalPrice: parseNumber(form.originalPrice, null),
        inStock: form.inStock,
        rating: parseNumber(form.rating, 4.5) ?? 4.5,
        notes: form.notes.trim(),
        description: form.description.trim(),
        origin: form.origin.trim(),
        altitude: form.altitude.trim(),
        process: form.process.trim(),
        image: imageUrls.length > 0 ? imageUrls[0] : null,
        images: imageUrls,
        featured: form.featured,
        stats: {
          acidity: parseNumber(form.acidity, 3) ?? 3,
          body: parseNumber(form.body, 3) ?? 3,
          sweetness: parseNumber(form.sweetness, 3) ?? 3,
          complexity: parseNumber(form.complexity, 3) ?? 3,
          finish: parseNumber(form.finish, 3) ?? 3,
        },
        serve: {
          vessel: form.vessel.trim(),
          grind: form.grind.trim(),
          temp: form.temp.trim(),
          time: form.time.trim(),
        },
        variantAttribute: form.variantAttribute.trim() || "Variant",
        variants: form.variants.map((variant) => ({
          label: variant.label.trim(),
          price: parseNumber(variant.price) ?? 0,
          discountPrice: parseNumber(variant.discountPrice, null),
          stock: parseNumber(variant.stock, 0) ?? 0,
        })),
      };

      if (mode === "create") {
        await createProduct(payload);
      } else if (product) {
        await updateProduct(product.id, payload);
      }

      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">{mode === "create" ? "Create product" : "Edit product"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            {mode === "create" ? "Add product to catalog" : `Editing ${product?.name}`}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Build catalogue pages with a clean, professional structure that matches the storefront experience.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-950 px-6 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          {loading ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold text-foreground">Product basics</p>
              <p className="text-sm text-muted">Core fields used by the storefront and catalog.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {mode === "create" ? (
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-600">Product id</span>
                  <input
                    value={normalize(form.productId)}
                    onChange={(event) => setField("productId", Number(event.target.value))}
                    type="number"
                    min={1}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-500">Product id</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{product?.id}</p>
                </div>
              )}

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-600">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  required
                  placeholder="Colombian Honey Roast"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-600">Category</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => setField("categoryId", event.target.value)}
                  required
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-600">Base price</span>
                  <input
                    value={form.basePrice}
                    onChange={(event) => setField("basePrice", event.target.value)}
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="29.99"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-600">Original price</span>
                  <input
                    value={form.originalPrice}
                    onChange={(event) => setField("originalPrice", event.target.value)}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="39.99"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Variants</p>
                <p className="text-sm text-muted">Manage pricing, discount, and stock per option.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    variants: [...prev.variants, { label: "", price: "0", discountPrice: "", stock: "" }],
                  }))
                }
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-950 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                Add variant
              </button>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-600">Variant attribute</span>
              <input
                value={form.variantAttribute}
                onChange={(event) => setField("variantAttribute", event.target.value)}
                placeholder="Size, Weight, Pack"
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {form.variants.length === 0 ? (
              <p className="text-sm text-muted">No variants added yet. Leave empty to use the base price only.</p>
            ) : null}

            <div className="space-y-4">
              {form.variants.map((variant, index) => (
                <div
                  key={`${variant.label}-${index}`}
                  className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1.25fr_0.9fr_0.9fr_0.9fr_0.45fr]"
                >
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">Label</span>
                    <input
                      value={variant.label}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, index2) =>
                            index2 === index ? { ...item, label: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="100g, 250g"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">Price</span>
                    <input
                      value={variant.price}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, index2) =>
                            index2 === index ? { ...item, price: event.target.value } : item,
                          ),
                        }))
                      }
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="29.99"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">Discount</span>
                    <input
                      value={variant.discountPrice}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, index2) =>
                            index2 === index
                              ? { ...item, discountPrice: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="24.99"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">Stock</span>
                    <input
                      value={variant.stock}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.map((item, index2) =>
                            index2 === index ? { ...item, stock: event.target.value } : item,
                          ),
                        }))
                      }
                      type="number"
                      min={0}
                      step="1"
                      placeholder="0"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        variants: prev.variants.filter((_, index2) => index2 !== index),
                      }))
                    }
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 hover:text-rose-900 xl:h-full"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(event) => setField("inStock", event.target.checked)}
                  className="h-5 w-5 rounded border border-slate-200 text-emerald-900 focus:ring-emerald-900"
                />
                <span className="font-medium">Available in stock</span>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-600">Rating</span>
                <input
                  value={form.rating}
                  onChange={(event) => setField("rating", event.target.value)}
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-foreground">Storefront exposition</p>
            <p className="text-sm text-muted">Customer-facing product content and media.</p>
          </div>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              required
              rows={4}
              placeholder="A bright roast with caramel sweetness and berry notes."
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              required
              rows={3}
              placeholder="Floral, honeyed, and balanced."
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <div className="space-y-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-600">Primary image URL</span>
              <input
                value={form.image}
                onChange={(event) => setField("image", event.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-600">Upload additional images</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageFileChange}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-foreground transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {fileError ? <p className="text-sm text-rose-700">{fileError}</p> : null}
            {existingImages.length > 0 ? (
              <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Existing images</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {existingImages.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative overflow-hidden rounded-[1.5rem] border border-slate-200">
                      <img src={url} alt={`Existing image ${index + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImages((current) => current.filter((_, i) => i !== index))}
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white transition hover:bg-black"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {imagePreviews.length > 0 ? (
              <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Preview selected images</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {imagePreviews.map((preview, index) => (
                    <img
                      key={`${preview}-${index}`}
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-full rounded-[1.5rem] object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <label className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setField("featured", event.target.checked)}
              className="h-5 w-5 rounded border border-slate-200 text-emerald-900 focus:ring-emerald-900"
            />
            <span className="font-medium">Featured product</span>
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-3xl border border-black/5 bg-slate-50 p-6">
          <h2 className="text-base font-semibold">Origin details</h2>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Origin</span>
            <input
              value={form.origin}
              onChange={(event) => setField("origin", event.target.value)}
              required
              placeholder="Colombia"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Altitude</span>
            <input
              value={form.altitude}
              onChange={(event) => setField("altitude", event.target.value)}
              placeholder="1400 - 1800 masl"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Process</span>
            <input
              value={form.process}
              onChange={(event) => setField("process", event.target.value)}
              placeholder="Washed"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="space-y-4 rounded-3xl border border-black/5 bg-slate-50 p-6">
          <h2 className="text-base font-semibold">Flavor stats</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Acidity", "acidity"],
                ["Body", "body"],
                ["Sweetness", "sweetness"],
                ["Complexity", "complexity"],
                ["Finish", "finish"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="space-y-2 text-sm">
                <span className="font-medium">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => setField(key, event.target.value)}
                  type="number"
                  min={1}
                  max={5}
                  step="1"
                  className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-black/5 bg-slate-50 p-6">
          <h2 className="text-base font-semibold">Serve guide</h2>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Vessel</span>
            <input
              value={form.vessel}
              onChange={(event) => setField("vessel", event.target.value)}
              placeholder="Pour-over"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Grind</span>
            <input
              value={form.grind}
              onChange={(event) => setField("grind", event.target.value)}
              placeholder="Medium-fine"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Water temp</span>
            <input
              value={form.temp}
              onChange={(event) => setField("temp", event.target.value)}
              placeholder="93°C"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Brew time</span>
            <input
              value={form.time}
              onChange={(event) => setField("time", event.target.value)}
              placeholder="3:30"
              className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-900 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </div>
      </div>
    </form>
  );
}
