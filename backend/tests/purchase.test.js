const {
  app,
  request,
  loginAdmin,
  createTestInventoryItem,
  createTestSupplier,
} = require("./helpers");
const InventoryItem = require("../src/models/InventoryItem");
const InventoryTransaction = require("../src/models/InventoryTransaction");
const Purchase = require("../src/models/Purchase");

describe("Admin purchases", () => {
  it("requires admin auth", async () => {
    const res = await request(app).get("/api/admin/purchases");
    expect(res.status).toBe(401);
  });

  it("creates a draft purchase without touching stock", async () => {
    const supplier = await createTestSupplier();
    const item = await createTestInventoryItem({ currentStock: 0 });
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({
        supplier: supplier._id.toString(),
        items: [{ itemId: item.itemId, quantity: 10, unitCost: 5, taxAmount: 2, discountAmount: 1 }],
        shippingCost: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
    // 10*5 + 2 - 1 = 51 line total; subtotal 50, tax 2, discount 1, shipping 3 -> total 54
    expect(res.body.data.subtotal).toBe(50);
    expect(res.body.data.total).toBe(54);

    const unchangedItem = await InventoryItem.findById(item._id);
    expect(unchangedItem.currentStock).toBe(0);
  });

  it("increases stock only on confirm, and rejects a second confirm", async () => {
    const supplier = await createTestSupplier();
    const item = await createTestInventoryItem({ currentStock: 5, avgCost: 0 });
    const { cookie } = await loginAdmin();

    const createRes = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({
        supplier: supplier._id.toString(),
        items: [{ itemId: item.itemId, quantity: 20, unitCost: 3 }],
      });
    const purchaseId = createRes.body.data.purchaseId;

    const confirmRes = await request(app)
      .post(`/api/admin/purchases/${purchaseId}/confirm`)
      .set("Cookie", cookie);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe("confirmed");

    const afterFirstConfirm = await InventoryItem.findById(item._id);
    expect(afterFirstConfirm.currentStock).toBe(25);

    const secondConfirm = await request(app)
      .post(`/api/admin/purchases/${purchaseId}/confirm`)
      .set("Cookie", cookie);
    expect(secondConfirm.status).toBe(400);

    // Stock must be unchanged by the rejected second confirm.
    const afterSecondAttempt = await InventoryItem.findById(item._id);
    expect(afterSecondAttempt.currentStock).toBe(25);

    const purchaseTx = await InventoryTransaction.find({ type: "purchase", item: item._id });
    expect(purchaseTx).toHaveLength(1);
    expect(purchaseTx[0].quantityChange).toBe(20);
  });

  it("blocks editing items on a confirmed purchase", async () => {
    const supplier = await createTestSupplier();
    const item = await createTestInventoryItem({ currentStock: 0 });
    const { cookie } = await loginAdmin();

    const createRes = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({ supplier: supplier._id.toString(), items: [{ itemId: item.itemId, quantity: 5, unitCost: 1 }] });
    const purchaseId = createRes.body.data.purchaseId;

    await request(app).post(`/api/admin/purchases/${purchaseId}/confirm`).set("Cookie", cookie);

    const editRes = await request(app)
      .patch(`/api/admin/purchases/${purchaseId}`)
      .set("Cookie", cookie)
      .send({ items: [{ itemId: item.itemId, quantity: 999, unitCost: 1 }] });

    expect(editRes.status).toBe(400);
  });

  it("reverses stock when cancelling a confirmed purchase", async () => {
    const supplier = await createTestSupplier();
    const item = await createTestInventoryItem({ currentStock: 0 });
    const { cookie } = await loginAdmin();

    const createRes = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({ supplier: supplier._id.toString(), items: [{ itemId: item.itemId, quantity: 15, unitCost: 2 }] });
    const purchaseId = createRes.body.data.purchaseId;

    await request(app).post(`/api/admin/purchases/${purchaseId}/confirm`).set("Cookie", cookie);
    expect((await InventoryItem.findById(item._id)).currentStock).toBe(15);

    const cancelRes = await request(app).post(`/api/admin/purchases/${purchaseId}/cancel`).set("Cookie", cookie);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("cancelled");
    expect((await InventoryItem.findById(item._id)).currentStock).toBe(0);
  });

  it("refuses to cancel a confirmed purchase whose stock has already been consumed elsewhere", async () => {
    const supplier = await createTestSupplier();
    const item = await createTestInventoryItem({ currentStock: 0 });
    const { cookie } = await loginAdmin();

    const createRes = await request(app)
      .post("/api/admin/purchases")
      .set("Cookie", cookie)
      .send({ supplier: supplier._id.toString(), items: [{ itemId: item.itemId, quantity: 10, unitCost: 2 }] });
    const purchaseId = createRes.body.data.purchaseId;
    await request(app).post(`/api/admin/purchases/${purchaseId}/confirm`).set("Cookie", cookie);

    // Consume 8 of the 10 received units via a manual wastage adjustment,
    // leaving only 2 — less than the 10 the cancellation would try to reverse.
    await request(app)
      .post(`/api/admin/inventory/items/${item.itemId}/adjust`)
      .set("Cookie", cookie)
      .send({ quantityChange: -8, reason: "simulate consumption", type: "wastage" });

    const cancelRes = await request(app).post(`/api/admin/purchases/${purchaseId}/cancel`).set("Cookie", cookie);
    expect(cancelRes.status).toBe(400);

    // Purchase must still be confirmed (not partially cancelled), and stock unchanged by the failed attempt.
    const purchase = await Purchase.findOne({ purchaseId });
    expect(purchase.status).toBe("confirmed");
    expect((await InventoryItem.findById(item._id)).currentStock).toBe(2);
  });
});
