const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const MAX_ROWS = 500;

const toBool = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw new Error("must be a boolean (true/false)");
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("must be a number");
  return parsed;
};

// Minimal CSV parser with quotes support (no external deps).
const parseCsv = (text) => {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        const next = input[i + 1];
        if (next === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      if (row.length === 1 && row[0].trim() === "") {
        row = [];
        continue;
      }
      rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("CSV has an unterminated quote");
  }

  // push last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0].trim() === "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((h) => String(h || "").trim());
  const records = rows.slice(1);
  return { headers, records };
};

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");

const buildRowObject = (headers, values) => {
  const obj = {};
  headers.forEach((header, idx) => {
    const key = normalizeHeader(header);
    obj[key] = values[idx] !== undefined ? String(values[idx]).trim() : "";
  });
  return obj;
};

const parseVariants = (value) => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("variants must be a JSON array");
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid variants JSON";
    throw new Error(message);
  }
};

const resolveCategoryId = async (rawValue, categoryByName) => {
  const value = String(rawValue || "").trim();
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  const lookup = categoryByName.get(value.toLowerCase());
  return lookup ? String(lookup) : null;
};

const validateAndBuildProduct = async (row, { categoryByName }) => {
  const errors = [];

  const name = String(row.name || "").trim();
  const categoryRaw = row.category || row.categoryid || row.category_id;
  const notes = String(row.notes || "").trim();
  const description = String(row.description || "").trim();
  const origin = String(row.origin || "").trim();

  let basePrice;
  let originalPrice;
  let inStock;
  let rating;
  let featured;
  let productId;
  let altitude;
  let process;
  let variantAttribute;
  let variants;

  if (!name) errors.push("name is required");
  if (!categoryRaw) errors.push("category is required (name or id)");
  if (!notes) errors.push("notes is required");
  if (!description) errors.push("description is required");
  if (!origin) errors.push("origin is required");

  try {
    basePrice = toNumber(row.baseprice ?? row.base_price);
    if (!Number.isFinite(basePrice) || basePrice < 0) errors.push("basePrice must be a non-negative number");
  } catch (err) {
    errors.push(`basePrice ${err.message || "is invalid"}`);
  }

  try {
    if (row.originalprice !== undefined && row.originalprice !== "") {
      originalPrice = toNumber(row.originalprice);
      if (originalPrice !== undefined && originalPrice !== null && originalPrice < 0) {
        errors.push("originalPrice must be a non-negative number");
      }
    }
  } catch (err) {
    errors.push(`originalPrice ${err.message || "is invalid"}`);
  }

  try {
    inStock = toBool(row.instock ?? row.in_stock);
  } catch (err) {
    errors.push(`inStock ${err.message || "is invalid"}`);
  }

  try {
    rating = toNumber(row.rating);
    if (rating !== undefined && (rating < 0 || rating > 5)) errors.push("rating must be between 0 and 5");
  } catch (err) {
    errors.push(`rating ${err.message || "is invalid"}`);
  }

  try {
    featured = toBool(row.featured);
  } catch (err) {
    errors.push(`featured ${err.message || "is invalid"}`);
  }

  if (row.productid || row.product_id || row.id) {
    const rawId = row.productid || row.product_id || row.id;
    const parsedId = Number(rawId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      errors.push("productId must be a positive number");
    } else {
      productId = parsedId;
    }
  }

  altitude = row.altitude ? String(row.altitude).trim() : undefined;
  process = row.process ? String(row.process).trim() : undefined;
  variantAttribute = row.variantattribute || row.variant_attribute ? String(row.variantattribute || row.variant_attribute).trim() : undefined;

  try {
    variants = parseVariants(row.variants);
  } catch (err) {
    errors.push(`variants ${err.message || "is invalid"}`);
  }

  const categoryId = await resolveCategoryId(categoryRaw, categoryByName);
  if (!categoryId) errors.push(`category '${String(categoryRaw).trim()}' not found`);

  const payload = {
    productId,
    name,
    category: categoryId,
    basePrice,
    originalPrice: originalPrice === undefined ? undefined : originalPrice,
    inStock: inStock === undefined ? undefined : inStock,
    rating: rating === undefined ? undefined : rating,
    notes,
    description,
    origin,
    altitude,
    process,
    featured: featured === undefined ? undefined : featured,
    variantAttribute,
    variants,
  };

  return { payload, errors };
};

const serializePreview = (payload) => ({
  id: payload.productId ?? null,
  name: payload.name,
  categoryId: payload.category ?? null,
  basePrice: payload.basePrice ?? null,
  inStock: payload.inStock ?? true,
  origin: payload.origin,
});

const bulkUploadProducts = asyncHandler(async (req, res) => {
  const dryRun = String(req.query.dryRun || "false").toLowerCase() === "true";
  const mode = String(req.query.mode || "create").toLowerCase(); // create | upsert

  if (!req.file || !req.file.buffer) {
    throw new ApiError(400, "CSV file is required (field name: file)");
  }

  const filename = String(req.file.originalname || "").toLowerCase();
  const isCsv = filename.endsWith(".csv") || req.file.mimetype === "text/csv";
  if (!isCsv) {
    throw new ApiError(400, "Only CSV uploads are supported right now. Export your Excel sheet as CSV and upload again.");
  }

  const { headers, records } = parseCsv(req.file.buffer.toString("utf8"));
  if (headers.length === 0) {
    throw new ApiError(400, "CSV is empty or missing headers");
  }

  if (records.length > MAX_ROWS) {
    throw new ApiError(400, `CSV row limit exceeded (max ${MAX_ROWS})`);
  }

  const requiredHeaders = ["name", "category", "baseprice", "notes", "description", "origin"];
  const headerSet = new Set(headers.map(normalizeHeader));
  const missing = requiredHeaders.filter((h) => !headerSet.has(h));
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required columns: ${missing.join(", ")}`);
  }

  const categories = await Category.find({}).select("_id name").lean();
  const categoryByName = new Map(categories.map((cat) => [String(cat.name).toLowerCase(), cat._id]));

  const results = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let index = 0; index < records.length; index++) {
    const values = records[index];
    const rowNumber = index + 2; // 1-based with header row
    const rowObj = buildRowObject(headers, values);

    // Ignore fully empty rows
    const hasAny = Object.values(rowObj).some((v) => String(v || "").trim() !== "");
    if (!hasAny) continue;

    const { payload, errors } = await validateAndBuildProduct(rowObj, { categoryByName });
    if (errors.length > 0) {
      failed += 1;
      results.push({ row: rowNumber, status: "error", errors, preview: serializePreview(payload) });
      continue;
    }

    // Assign productId if missing (only on non-dryRun create)
    if (!payload.productId && !dryRun) {
      const latestProduct = await Product.findOne().sort({ productId: -1 }).select("productId").lean();
      payload.productId = latestProduct ? latestProduct.productId + 1 : 1;
    }

    if (dryRun) {
      results.push({ row: rowNumber, status: "ok", preview: serializePreview(payload) });
      continue;
    }

    const existing = payload.productId ? await Product.findOne({ productId: payload.productId }).lean() : null;

    if (existing) {
      if (mode !== "upsert") {
        failed += 1;
        results.push({
          row: rowNumber,
          status: "error",
          errors: [`productId ${payload.productId} already exists (use mode=upsert to update)`],
          preview: serializePreview(payload),
        });
        continue;
      }

      const updatePayload = { ...payload };
      delete updatePayload.productId;

      await Product.updateOne({ productId: payload.productId }, updatePayload, { runValidators: true });
      updated += 1;
      results.push({ row: rowNumber, status: "updated", preview: serializePreview(payload) });
      continue;
    }

    // Validate unique name? Product model doesn't enforce name uniqueness; we keep as-is.
    await Product.create(payload);
    created += 1;
    results.push({ row: rowNumber, status: "created", preview: serializePreview(payload) });
  }

  res.status(200).json({
    success: true,
    data: {
      dryRun,
      mode,
      summary: {
        totalRows: records.length,
        created,
        updated,
        failed,
      },
      results,
    },
  });
});

module.exports = {
  bulkUploadProducts,
};

