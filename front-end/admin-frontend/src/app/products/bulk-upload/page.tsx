"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { bulkUploadProductsCsv, type AdminBulkUploadResponse } from "@/lib/admin-product-api";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";

const TEMPLATE = `name,category,basePrice,notes,description,origin,altitude,process,inStock,featured,productId,variants
"Kenya AA","Single Origin",18.5,"Blackcurrant, juicy","Bright acidity with jammy sweetness.","Kenya","1800m","Washed",true,false,,
"House Espresso","Espresso",16,"Chocolate, caramel","Balanced blend for espresso and milk drinks.","Blend","", "",true,true,,
`;

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "products-bulk-upload-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function BulkUploadProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "upsert">("create");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AdminBulkUploadResponse | null>(null);
  const [result, setResult] = useState<AdminBulkUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const data = result ?? preview;
    if (!data) return null;
    const ok = data.results.filter((r) => r.status !== "error").length;
    const errors = data.results.filter((r) => r.status === "error").length;
    return { ok, errors, ...data.summary };
  }, [preview, result]);

  const rowsForTable = useMemo(() => {
    const data = result ?? preview;
    if (!data) return [];
    return data.results.slice(0, 20);
  }, [preview, result]);

  const runDryPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);

    try {
      const data = await bulkUploadProductsCsv(file, { dryRun: true, mode });
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview CSV.");
    } finally {
      setLoading(false);
    }
  };

  const submitUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await bulkUploadProductsCsv(file, { dryRun: false, mode });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Bulk upload products"
        description="Upload multiple coffee products at once using a CSV export. Preview validation results before creating or updating products."
        badge="Catalog"
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AdminCard title="Upload file" eyebrow="CSV">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted">
                Use the template, fill required columns, then upload. Excel sheets should be exported as <span className="font-semibold">CSV</span> first.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900"
                >
                  <Download className="h-4 w-4" />
                  Download template
                </button>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-900 hover:text-emerald-900"
                >
                  Back to products
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-black/8 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mode</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                    mode === "create" ? "bg-emerald-950 text-white" : "bg-white text-slate-900 hover:bg-white/80",
                  )}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upsert")}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                    mode === "upsert" ? "bg-emerald-950 text-white" : "bg-white text-slate-900 hover:bg-white/80",
                  )}
                >
                  Upsert
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Create: fails if `productId` exists. Upsert: updates existing `productId`.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <label className="group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.8rem] border border-dashed border-black/15 bg-[linear-gradient(180deg,_rgba(16,185,129,0.08)_0%,_rgba(255,255,255,0.8)_100%)] p-6 text-center transition hover:border-emerald-900/40">
              <input
                type="file"
                accept=".csv,text/csv"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null;
                  setFile(selected);
                  setPreview(null);
                  setResult(null);
                  setError(null);
                }}
              />
              <UploadCloud className="h-7 w-7 text-emerald-950/80" />
              <p className="text-sm font-semibold text-slate-900">
                {file ? file.name : "Click to choose a CSV file"}
              </p>
              <p className="text-xs text-slate-600">Max 2MB, up to 500 rows</p>
            </label>

            <div className="rounded-[1.8rem] border border-black/6 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-900">
                <FileSpreadsheet className="h-5 w-5" />
                <p className="text-sm font-semibold">Required columns</p>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                `name`, `category`, `basePrice`, `notes`, `description`, `origin`
              </p>
              <p className="mt-4 text-xs text-slate-500">
                Optional: `productId`, `originalPrice`, `inStock`, `featured`, `altitude`, `process`, `variantAttribute`,
                `variants` (JSON array).
              </p>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={!file || loading}
              onClick={() => void runDryPreview()}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition",
                !file || loading ? "bg-slate-100 text-slate-400" : "bg-emerald-950 text-white hover:bg-emerald-900",
              )}
            >
              Preview & validate
            </button>
            <button
              type="button"
              disabled={!file || loading || !preview}
              onClick={() => void submitUpload()}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition",
                !file || loading || !preview
                  ? "bg-slate-100 text-slate-400"
                  : "bg-[linear-gradient(90deg,_#8b5a2b_0%,_#d4a271_100%)] text-white hover:opacity-95",
              )}
            >
              Upload products
            </button>
            {loading ? <p className="text-sm text-slate-600">Working…</p> : null}
          </div>
        </AdminCard>

        <AdminCard title="Preview" eyebrow="Results">
          {!preview && !result ? (
            <div className="rounded-[1.6rem] border border-black/6 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">Nothing to show yet</p>
              <p className="mt-2 text-sm text-slate-600">Upload a CSV and run “Preview & validate” to see the parsed rows.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summary ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-black/6 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Rows</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalRows}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-black/6 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Errors</p>
                    <p className={cn("mt-2 text-2xl font-bold", summary.errors > 0 ? "text-rose-700" : "text-emerald-700")}>
                      {summary.errors}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[1.6rem] border border-black/6">
                <div className="admin-table-wrap">
                  <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Row</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Base price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {rowsForTable.map((row) => (
                        <tr key={`${row.row}-${row.status}`} className={cn(row.status === "error" && "bg-rose-50/40")}>
                          <td className="px-4 py-3 text-slate-700">{row.row}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                                row.status === "error" && "bg-rose-100 text-rose-700",
                                row.status !== "error" && "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-900">{row.preview?.name || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.preview?.basePrice !== null && row.preview?.basePrice !== undefined
                              ? `₹${Number(row.preview.basePrice).toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(result ?? preview)?.results.some((r) => r.status === "error") ? (
                <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-4 text-rose-800">
                  <p className="font-semibold">Fix errors and re-upload</p>
                  <p className="mt-2 text-sm">
                    Open the CSV, correct the row values, then run preview again. Only the first 20 rows are shown here.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
