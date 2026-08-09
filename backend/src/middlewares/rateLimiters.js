const rateLimit = require("express-rate-limit");

// The integration test suite runs many requests against one shared Express
// app instance in a single process (tests/setup.js) — rate limiting is
// infrastructure, not something those tests are trying to verify, so it's
// skipped in NODE_ENV=test to avoid spurious 429s unrelated to whatever a
// given test actually checks.
const isTestEnv = process.env.NODE_ENV === "test";

// Same reasoning extends to local development: a single admin dashboard
// mount alone fires 5+ requests, and Fast Refresh/StrictMode remounts or a
// few manual page reloads burn through the 300/15min budget in minutes,
// then every retry keeps 429ing until the window resets. This is abuse
// prevention for real traffic, not something a trusted local dev session
// should be throttled by — production always sets NODE_ENV=production
// (otpSender.js already hard-fails otherwise), so this can't accidentally
// leave a real deployment unprotected.
const isDevEnv = process.env.NODE_ENV === "development";

// Applied to every /api route. Generous enough not to interfere with normal
// browsing/checkout traffic, but stops unbounded scripted abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv || isDevEnv,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Applied specifically to OTP request/verify endpoints (customer + admin).
// These are the highest-value target for brute force / spam — an attacker
// with unlimited attempts can guess a 6-digit OTP well within a normal
// request budget, and repeated request-otp calls can be used to spam a
// phone number. Stacks on top of apiLimiter, not a replacement for it.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv || isDevEnv,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

module.exports = { apiLimiter, authLimiter };
