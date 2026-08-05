const mongoose = require("mongoose");
const { productListCache, categoryListCache } = require("../src/utils/cache");

// Env vars must be set before any test file requires ../src/app (which
// pulls in controllers that read process.env at call time, not import
// time, so this ordering is mostly a formality — but keeping it explicit
// avoids surprises if that ever changes).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-do-not-use-in-production";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.ADMIN_PHONE_NUMBERS = process.env.ADMIN_PHONE_NUMBERS || "9000000001";
process.env.NODE_ENV = "test";

// Tests run against a real MongoDB (not an in-memory server — this
// environment can't reliably download the mongodb-memory-server binary),
// using a dedicated database derived from MONGODB_URI so they never touch
// real data. Requires a reachable MongoDB instance; this is also why CI
// spins up a `mongo` service container (see .github/workflows/ci.yml).
const baseUri = process.env.MONGODB_URI || "mongodb://localhost:27017/coffee-ecommrece";
const TEST_URI = baseUri.replace(/\/[^/]+$/, "/coffee-ecommrece-test");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  // Without this, a "list products" test could see a cached response left
  // over from an earlier test in the same file/process (jest runs a whole
  // file in one process) — the DB gets wiped above, but the in-process
  // cache doesn't know that.
  productListCache.clear();
  categoryListCache.clear();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
