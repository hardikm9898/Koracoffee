const { app, request, loginAdmin, createTestInventoryItem } = require("./helpers");
const InventoryItem = require("../src/models/InventoryItem");
const InventoryTransaction = require("../src/models/InventoryTransaction");

describe("Admin inventory — items & ledger", () => {
  it("requires admin auth", async () => {
    const res = await request(app).get("/api/admin/inventory/items");
    expect(res.status).toBe(401);
  });

  it("creates an item with opening stock and records an 'opening' ledger transaction", async () => {
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .post("/api/admin/inventory/items")
      .set("Cookie", cookie)
      .send({
        name: "Arabica Beans",
        sku: `arb-${Date.now()}`,
        type: "raw_material",
        unit: "kg",
        minStock: 5,
        reorderLevel: 10,
        openingStock: 50,
        openingCost: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.currentStock).toBe(50);
    expect(res.body.data.avgCost).toBe(4);
    expect(res.body.data.status).toBe("in_stock");

    const tx = await InventoryTransaction.findOne({ type: "opening" }).sort({ createdAt: -1 });
    expect(tx).not.toBeNull();
    expect(tx.quantityChange).toBe(50);
    expect(tx.beforeStock).toBe(0);
    expect(tx.afterStock).toBe(50);
  });

  it("rejects a duplicate SKU", async () => {
    const { cookie } = await loginAdmin();
    const sku = `dup-${Date.now()}`;

    await request(app)
      .post("/api/admin/inventory/items")
      .set("Cookie", cookie)
      .send({ name: "Item A", sku, type: "packaging", unit: "pcs" });

    const res = await request(app)
      .post("/api/admin/inventory/items")
      .set("Cookie", cookie)
      .send({ name: "Item B", sku, type: "packaging", unit: "pcs" });

    expect(res.status).toBe(400);
  });

  it("weighted-averages cost across two purchase-type increases", async () => {
    const item = await createTestInventoryItem({ currentStock: 0, avgCost: 0 });
    const { increaseStock } = require("../src/services/inventoryLedgerService");

    await increaseStock({ itemObjectId: item._id, quantity: 10, unitCost: 2, type: "purchase" });
    const { item: updated } = await increaseStock({ itemObjectId: item._id, quantity: 10, unitCost: 4, type: "purchase" });

    // (10*2 + 10*4) / 20 = 3
    expect(updated.avgCost).toBe(3);
    expect(updated.currentStock).toBe(20);
  });

  it("never lets concurrent decrements push stock below zero", async () => {
    const item = await createTestInventoryItem({ currentStock: 1, avgCost: 5 });
    const { cookie } = await loginAdmin();

    const decrement = () =>
      request(app)
        .post(`/api/admin/inventory/items/${item.itemId}/adjust`)
        .set("Cookie", cookie)
        .send({ quantityChange: -1, reason: "concurrency test", type: "wastage" });

    const results = await Promise.all([decrement(), decrement(), decrement(), decrement(), decrement()]);

    const succeeded = results.filter((r) => r.status === 200);
    const failed = results.filter((r) => r.status === 400);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(4);

    const finalItem = await InventoryItem.findById(item._id);
    expect(finalItem.currentStock).toBe(0);
  });

  it("rejects a decrease larger than current stock without mutating anything", async () => {
    const item = await createTestInventoryItem({ currentStock: 3 });
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .post(`/api/admin/inventory/items/${item.itemId}/adjust`)
      .set("Cookie", cookie)
      .send({ quantityChange: -10, reason: "too much", type: "damage" });

    expect(res.status).toBe(400);
    const unchanged = await InventoryItem.findById(item._id);
    expect(unchanged.currentStock).toBe(3);

    const txCount = await InventoryTransaction.countDocuments({ item: item._id });
    expect(txCount).toBe(0);
  });

  it("filters low/critical/out-of-stock items in the dashboard", async () => {
    await createTestInventoryItem({ currentStock: 0, minStock: 5, reorderLevel: 10 });
    await createTestInventoryItem({ currentStock: 3, minStock: 5, reorderLevel: 10 });
    await createTestInventoryItem({ currentStock: 8, minStock: 5, reorderLevel: 10 });
    await createTestInventoryItem({ currentStock: 100, minStock: 5, reorderLevel: 10 });

    const { cookie } = await loginAdmin();
    const res = await request(app).get("/api/admin/inventory/dashboard").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.outOfStockCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.criticalStockCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.lowStockCount).toBeGreaterThanOrEqual(1);
  });
});
