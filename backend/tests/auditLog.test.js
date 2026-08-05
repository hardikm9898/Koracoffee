const { app, request, loginAdmin, createTestCategory } = require("./helpers");
const AuditLog = require("../src/models/AuditLog");

// The audit log write is fire-and-forget (see middlewares/auditLog.js —
// it must never block or fail the actual admin action), fired from a
// res "finish" listener that runs after supertest's request() promise has
// already resolved. A short wait lets that async write settle before
// asserting against the AuditLog collection.
const waitForAuditWrite = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("Admin audit log", () => {
  it("records a mutating admin action", async () => {
    const { cookie } = await loginAdmin();

    await request(app)
      .post("/api/admin/categories")
      .set("Cookie", cookie)
      .send({ name: `Audit Test ${Date.now()}` });

    await waitForAuditWrite();

    const entries = await AuditLog.find({ method: "POST", path: "/api/admin/categories" });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].adminPhone).toBe(process.env.ADMIN_PHONE_NUMBERS.split(",")[0].trim());
    expect(entries[0].success).toBe(true);
  });

  it("records a failed mutating admin action with success:false", async () => {
    const { cookie } = await loginAdmin();

    // Duplicate category name -> 409
    await createTestCategory("Dup Name");
    await request(app).post("/api/admin/categories").set("Cookie", cookie).send({ name: "Dup Name" });

    await waitForAuditWrite();

    const entry = await AuditLog.findOne({ method: "POST", path: "/api/admin/categories", statusCode: 409 });
    expect(entry).not.toBeNull();
    expect(entry.success).toBe(false);
  });

  it("does not record GET requests", async () => {
    const { cookie } = await loginAdmin();

    await request(app).get("/api/admin/categories").set("Cookie", cookie);
    await waitForAuditWrite();

    const entries = await AuditLog.find({ method: "GET" });
    expect(entries).toHaveLength(0);
  });

  it("is only readable by an admin", async () => {
    const unauth = await request(app).get("/api/admin/audit-log");
    expect(unauth.status).toBe(401);

    const { cookie } = await loginAdmin();
    const admin = await request(app).get("/api/admin/audit-log").set("Cookie", cookie);
    expect(admin.status).toBe(200);
    expect(admin.body.data).toHaveProperty("items");
    expect(admin.body.data).toHaveProperty("pagination");
  });
});
