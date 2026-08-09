const {
  app,
  request,
  registerAndLoginUser,
  loginAdmin,
  createTestProduct,
  createTestInventoryItem,
  createTestSupplier,
} = require("./helpers");
const Recipe = require("../src/models/Recipe");

const shippingFor = (phoneNumber) => ({
  name: "Test User",
  email: "t@example.com",
  phone: phoneNumber,
  address: "123 Test St",
  city: "Test City",
  state: "Test State",
  country: "IN",
  zip: "400001",
});

describe("Admin expenses", () => {
  it("requires admin auth", async () => {
    const res = await request(app).get("/api/admin/expenses");
    expect(res.status).toBe(401);
  });

  it("only accepts operational categories — no raw-material or packaging category exists", async () => {
    const { cookie } = await loginAdmin();
    const res = await request(app)
      .post("/api/admin/expenses")
      .set("Cookie", cookie)
      .send({ category: "raw_material_purchase", amount: 100 });
    expect(res.status).toBe(400);
  });

  it("creates, lists, and totals expenses", async () => {
    const { cookie } = await loginAdmin();

    await request(app).post("/api/admin/expenses").set("Cookie", cookie).send({ category: "rent", amount: 500 });
    await request(app).post("/api/admin/expenses").set("Cookie", cookie).send({ category: "marketing", amount: 150 });

    const res = await request(app).get("/api/admin/expenses").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.totalAmount).toBeGreaterThanOrEqual(650);
  });
});

describe("Profitability report", () => {
  it("computes revenue, COGS from real consumption cost, opex, and margin correctly end to end", async () => {
    const product = await createTestProduct({ basePrice: 20 });
    const beans = await createTestInventoryItem({ currentStock: 1000, avgCost: 3 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 2 }] });

    const { token, phoneNumber } = await registerAndLoginUser();
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.productId, variant: "250g", quantity: 5 }], shipping: shippingFor(phoneNumber) });
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data;

    const { cookie } = await loginAdmin();
    // Move to Packaging -> consumes 2*5=10 units of beans at avgCost 3 -> COGS 30 for this order.
    const packagingRes = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Packaging" });
    expect(packagingRes.status).toBe(200);

    await request(app).post("/api/admin/expenses").set("Cookie", cookie).send({ category: "rent", amount: 40 });

    const reportRes = await request(app).get("/api/admin/reports/profitability").set("Cookie", cookie);
    expect(reportRes.status).toBe(200);

    const report = reportRes.body.data;
    // subtotal = basePrice(20) * 5 = 100 (250g fallback multiplier is 1.0x)
    expect(report.grossSales).toBeGreaterThanOrEqual(100);
    expect(report.cogs).toBeGreaterThanOrEqual(30);
    expect(report.operatingExpenses).toBeGreaterThanOrEqual(40);

    // Internal consistency of the formula chain, regardless of what other
    // tests' data also landed in the (unscoped) aggregate.
    expect(report.netSales).toBe(Math.round((report.grossSales - report.discounts + report.shippingRevenue) * 100) / 100);
    expect(report.grossProfit).toBe(Math.round((report.netSales - report.cogs) * 100) / 100);
    expect(report.netProfit).toBe(Math.round((report.grossProfit - report.operatingExpenses) * 100) / 100);
  });

  it("excludes cancelled/refunded orders from revenue", async () => {
    const product = await createTestProduct({ basePrice: 50 });
    const { token, phoneNumber } = await registerAndLoginUser();
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.productId, variant: "250g", quantity: 1 }], shipping: shippingFor(phoneNumber) });
    const order = orderRes.body.data;

    const { cookie } = await loginAdmin();
    await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Cancelled", cancelReason: "test" });

    const from = new Date(Date.now() - 1000).toISOString();
    const reportRes = await request(app)
      .get(`/api/admin/reports/profitability?dateFrom=${from}`)
      .set("Cookie", cookie);

    // Only this cancelled order falls in the tight window — it must not count.
    expect(reportRes.body.data.orderCount).toBe(0);
    expect(reportRes.body.data.grossSales).toBe(0);
  });
});

describe("Product cost report", () => {
  it("reports selling price, COGS breakdown, and margin from the active recipe", async () => {
    const product = await createTestProduct({ basePrice: 25 });
    const raw = await createTestInventoryItem({ type: "raw_material", avgCost: 4 });
    const packaging = await createTestInventoryItem({ type: "packaging", avgCost: 1 });
    await Recipe.create({
      product: product.productId,
      variant: "",
      components: [
        { item: raw._id, quantity: 2 },
        { item: packaging._id, quantity: 1 },
      ],
    });

    const { cookie } = await loginAdmin();
    const res = await request(app).get("/api/admin/reports/product-cost").set("Cookie", cookie);
    expect(res.status).toBe(200);

    const row = res.body.data.find((r) => r.productId === product.productId);
    expect(row).toBeDefined();
    expect(row.rawMaterialCost).toBe(8); // 2*4
    expect(row.packagingCost).toBe(1); // 1*1
    expect(row.totalCogs).toBe(9);
    expect(row.sellingPrice).toBe(25);
    expect(row.grossProfit).toBe(16);
    expect(row.marginPercent).toBe(64);
  });
});

describe("Purchase report", () => {
  it("aggregates confirmed purchases by supplier and item", async () => {
    const supplier = await createTestSupplier({ name: "Report Supplier" });
    const item = await createTestInventoryItem();
    const { cookie } = await loginAdmin();

    const createRes = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({ supplier: supplier._id.toString(), items: [{ itemId: item.itemId, quantity: 20, unitCost: 3 }] });
    await request(app).post(`/api/admin/purchases/${createRes.body.data.purchaseId}/confirm`).set("Cookie", cookie);

    const res = await request(app).get("/api/admin/reports/purchases").set("Cookie", cookie);
    expect(res.status).toBe(200);

    const supplierRow = res.body.data.bySupplier.find((r) => r.supplierName === "Report Supplier");
    expect(supplierRow).toBeDefined();
    expect(supplierRow.totalValue).toBeGreaterThanOrEqual(60);

    const itemRow = res.body.data.byItem.find((r) => r.itemId === String(item._id));
    expect(itemRow).toBeDefined();
    expect(itemRow.totalQuantity).toBeGreaterThanOrEqual(20);
  });
});
