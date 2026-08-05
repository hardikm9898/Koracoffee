const rateLimit = require("express-rate-limit");

// The integration test suite runs many requests against one shared Express
// app instance in a single process (tests/setup.js) — rate limiting is
// infrastructure, not something those tests are trying to verify, so it's
// skipped in NODE_ENV=test to avoid spurious 429s unrelated to whatever a
// given test actually checks.
const isTestEnv = process.env.NODE_ENV === "test";

// Applied to every /api route. Generous enough not to interfere with normal
// browsing/checkout traffic, but stops unbounded scripted abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
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
  skip: () => isTestEnv,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

module.exports = { apiLimiter, authLimiter };
