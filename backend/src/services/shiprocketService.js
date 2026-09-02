const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";

const getCredentials = () => {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new ApiError(500, "Shipping is not configured");
  }
  return { email, password };
};

// Shiprocket tokens are valid for 240 hours (10 days) — cached in-process
// and refreshed a day early rather than tracked to the exact second. This
// is a single-instance deployment (see project-context/known-limitations.md
// #45 for the same in-process-cache tradeoff already accepted elsewhere),
// so a fresh login on process restart is fine; nothing needs to survive it.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const login = async () => {
  const { email, password } = getCredentials();

  let response;
  try {
    response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError(502, "Unable to reach the shipping provider");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    throw new ApiError(
      502,
      data?.message || "Unable to authenticate with the shipping provider",
    );
  }

  cachedToken = data.token;
  cachedTokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return cachedToken;
};

const getToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }
  return login();
};

const shiprocketRequest = async (path, { method = "GET", body } = {}) => {
  const requestOnce = async (token) => {
    let response;
    try {
      response = await fetch(`${SHIPROCKET_API_BASE}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(502, "Unable to reach the shipping provider");
    }
    return response;
  };

  let response = await requestOnce(await getToken());

  if (response.status === 401) {
    // Cached token was rejected (expired/revoked server-side) — log in
    // again once and retry, rather than surfacing a spurious auth error.
    cachedToken = null;
    response = await requestOnce(await getToken());
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      502,
      data?.message || `Shipping provider request to ${path} failed`,
    );
  }
  return data;
};

// Parses a variant label like "250g" / "1kg" into kilograms for Shiprocket's
// required order weight — we don't track per-product package weight
// anywhere, so this mirrors pricingService.js's FALLBACK_VARIANTS label
// convention instead. Falls back to a typical retail coffee bag (0.25kg)
// for any label that doesn't parse, so an unusual variant name never blocks
// shipment creation outright.
const DEFAULT_ITEM_WEIGHT_KG = 0.25;
const estimateItemWeightKg = (variantLabel) => {
  const match = String(variantLabel || "").match(/([\d.]+)\s*(kg|g)/i);
  if (!match) return DEFAULT_ITEM_WEIGHT_KG;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_ITEM_WEIGHT_KG;
  return match[2].toLowerCase() === "kg" ? value : value / 1000;
};

// Creates a Shiprocket "adhoc" order from one of our Order documents. Only
// called once per Order (shippingController guards on
// order.shiprocketShipmentId already being set) — Shiprocket order_ids must
// be unique per account, and we reuse our own orderCode for it so the two
// systems can be cross-referenced by eye.
const createOrder = async (order) => {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) {
    throw new ApiError(500, "SHIPROCKET_PICKUP_LOCATION is not configured");
  }

  const totalWeightKg = order.items.reduce(
    (sum, item) => sum + estimateItemWeightKg(item.variant) * item.quantity,
    0,
  );

  const [firstName, ...rest] = String(order.shipping.name || "")
    .trim()
    .split(" ");

  const payload = {
    order_id: String(order.orderCode),
    order_date: new Date(order.createdAt || Date.now())
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    pickup_location: pickupLocation,
    billing_customer_name: firstName || order.shipping.name,
    billing_last_name: rest.join(" "),
    billing_address: order.shipping.address,
    billing_address_2: order.shipping.apartment || "",
    billing_city: order.shipping.city,
    billing_pincode: order.shipping.zip,
    billing_state: order.shipping.state,
    billing_country: order.shipping.country || "India",
    billing_email: order.shipping.email,
    billing_phone: order.shipping.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.name,
      sku: `${item.productId}-${item.variant}`,
      units: item.quantity,
      selling_price: item.price,
    })),
    payment_method: order.paymentGateway === "razorpay" ? "Prepaid" : "COD",
    sub_total: order.subtotal,
    // No per-product dimensions are tracked — these are reasonable defaults
    // for a small retail coffee-bag parcel. Revisit if products with very
    // different packaging (e.g. bulk/gift sets) are added.
    length: 15,
    breadth: 10,
    height: 10,
    weight: Math.max(totalWeightKg, 0.1),
  };

  const data = await shiprocketRequest("/orders/create/adhoc", {
    method: "POST",
    body: payload,
  });

  if (!data.shipment_id) {
    throw new ApiError(502, data?.message || "Shipping provider did not return a shipment id");
  }

  return { shiprocketOrderId: data.order_id, shipmentId: data.shipment_id };
};

// Lets Shiprocket auto-select the recommended courier rather than
// presenting a courier-choice UI — keeps the admin "Ship" action a single
// click. Revisit if a real courier-preference need shows up.
const assignAWB = async (shipmentId) => {
  const data = await shiprocketRequest("/courier/assign/awb", {
    method: "POST",
    body: { shipment_id: shipmentId },
  });

  const response = data?.response?.data;
  if (!response?.awb_code) {
    throw new ApiError(502, data?.message || "Shipping provider did not return an AWB code");
  }

  return { awbCode: String(response.awb_code), courierName: response.courier_name || "" };
};

const generatePickup = async (shipmentId) => {
  try {
    await shiprocketRequest("/courier/generate/pickup", {
      method: "POST",
      body: { shipment_id: [shipmentId] },
    });
    return { scheduled: true };
  } catch (err) {
    // Non-fatal: the shipment/AWB are already booked by this point, and
    // pickup scheduling can be retried directly from the Shiprocket panel
    // (e.g. if no pickup slot is currently available) — don't undo the AWB
    // assignment over this failing.
    logger.warn({ shipmentId, err: err.message }, "Shiprocket pickup scheduling failed");
    return { scheduled: false, error: err.message };
  }
};

const generateLabel = async (shipmentId) => {
  const data = await shiprocketRequest("/courier/generate/label", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
  });

  if (!data?.label_url) {
    throw new ApiError(502, data?.message || "Shipping provider did not return a label URL");
  }

  return data.label_url;
};

module.exports = { createOrder, assignAWB, generatePickup, generateLabel };
