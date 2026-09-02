const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

const getCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ApiError(500, "Payment gateway is not configured");
  }
  return { keyId, keySecret };
};

// Creates a Razorpay order (their side of "an order about to be paid") via
// the plain REST API — no razorpay SDK dependency needed for just this and
// signature verification below. amount is in the smallest currency unit
// (paise for INR), computed server-side from the authoritative order total,
// never trusted from the client.
const createRazorpayOrder = async ({ amount, receipt }) => {
  const { keyId, keySecret } = getCredentials();

  let response;
  try {
    response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        payment_capture: 1,
      }),
    });
  } catch {
    throw new ApiError(502, "Unable to reach the payment gateway");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(502, data?.error?.description || "Unable to create a payment order");
  }

  return data;
};

// Razorpay's documented checkout-verification scheme: HMAC-SHA256 of
// "{order_id}|{payment_id}" using the (secret, never client-exposed) key
// secret must match the signature Razorpay handed back to the client after
// a successful payment. This is what actually proves the payment happened —
// nothing before this point (created order, opened checkout modal) confirms
// money changed hands.
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getCredentials();

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(String(signature || ""), "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

module.exports = { createRazorpayOrder, verifyPaymentSignature };
