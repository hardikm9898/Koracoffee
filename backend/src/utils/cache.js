// Minimal in-process, TTL-based cache. This is deliberately NOT Redis or
// any distributed cache — no such infrastructure is reachable in this
// environment (see project-context/blocked-external-resources.md). It only
// helps a single backend instance; once the backend runs on more than one
// instance behind a load balancer, each instance has its own independent
// cache and this stops being a meaningful shared cache. That's an
// acceptable tradeoff for now — it still cuts DB load for the common case
// of one instance, and TTL + explicit invalidation on writes (see
// productController.js / categoryController.js) keeps it correct either way.
class MemoryCache {
  constructor(defaultTtlMs = 60_000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear() {
    this.store.clear();
  }
}

// Invalidation only happens through the controllers below (create/update/
// delete calling .clear()) — a write that bypasses the API entirely (a
// direct MongoDB write, a script, another service) won't invalidate this,
// and will only become visible once the TTL expires. That's the tradeoff
// of an in-process cache with explicit invalidation rather than something
// like MongoDB change streams; acceptable here since this app has no other
// write path into these collections besides its own API.
//
// Product listing (GET /api/products) is the highest-read, lowest-write
// endpoint in the app — browsing/searching the catalog hits it repeatedly
// with a small set of realistic query combinations. Short TTL (30s) as a
// safety net; explicitly cleared on any product OR category write (a
// cached product-list response embeds category names in `filters.categories`,
// so a category rename must invalidate this too — see categoryController.js).
const productListCache = new MemoryCache(30_000);

// Category listing changes rarely and is read on nearly every storefront
// page (nav/filters) — longer TTL, cleared on any category write.
const categoryListCache = new MemoryCache(60_000);

module.exports = { MemoryCache, productListCache, categoryListCache };
