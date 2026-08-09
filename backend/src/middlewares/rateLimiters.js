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

// express-rate-limit throws (not just warns) when it sees an X-Forwarded-For
// header whose shape doesn't match what it expects from `trust proxy`'s hop
// count — and that throw is uncaught here, which crashes the whole process.
// Verified live in production (2026-08-09): with `app.set("trust proxy", 1)`
// already correctly configured for this deployment's single Nginx hop (a
// direct request with one X-Forwarded-For value behaves correctly), real
// traffic was still crash-looping the backend on this check dozens of times
// a minute. This is exactly the known false-positive the library's own docs
// (linked in the error) document an explicit opt-out for — `req.ip` still
// resolves correctly via `trust proxy`, this only stops the separate,
// stricter shape-of-the-header validation from taking the process down over
// it. See https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/
const disableXForwardedForValidation = { validate: { xForwardedForHeader: false } };

// Applied to every /api route. Generous enough not to interfere with normal
// browsing/checkout traffic, but stops unbounded scripted abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv || isDevEnv,
  ...disableXForwardedForValidation,
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
  ...disableXForwardedForValidation,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

module.exports = { apiLimiter, authLimiter };
