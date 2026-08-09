const {
  app,
  request,
  registerAndLoginUser,
  loginAdmin,
  createTestProduct,
  createTestInventoryItem,
} = require("./helpers");
const Order = require("../src/models/Order");
const InventoryItem = require("../src/models/InventoryItem");
const InventoryTransaction = require("../src/models/InventoryTransaction");
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

const placeOrder = async (product, variant, quantity) => {
  const { token, phoneNumber } = await registerAndLoginUser();
  const res = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [{ productId: product.productId, variant, quantity }],
      shipping: shippingFor(phoneNumber),
    });
  expect(res.status).toBe(201);
  return res.body.data;
};

describe("Order -> Packaging raw-material consumption", () => {
  it("consumes recipe components exactly once when order reaches Packaging", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const beans = await createTestInventoryItem({ name: "Beans", currentStock: 100, avgCost: 2 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 5 }] });

    const order = await placeOrder(product, "250g", 3);
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Packaging" });

    expect(res.status).toBe(200);
    expect(res.body.data.rawMaterialsConsumedAt).not.toBeNull();

    const item = await InventoryItem.findById(beans._id);
    expect(item.currentStock).toBe(100 - 5 * 3); // 85

    const tx = await InventoryTransaction.findOne({ type: "consumption", item: beans._id });
    expect(tx.quantityChange).toBe(-15);
    expect(String(tx.order)).toBe(String((await Order.findOne({ orderId: order.id }))._id));

    // Re-entering Packaging (status oscillation) must not consume again.
    await request(app).patch(`/api/admin/orders/${order.id}`).set("Cookie", cookie).send({ status: "Roasting" });
    const secondRes = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Packaging" });
    expect(secondRes.status).toBe(200);

    const itemAfterSecond = await InventoryItem.findById(beans._id);
    expect(itemAfterSecond.currentStock).toBe(85);
    const txCount = await InventoryTransaction.countDocuments({ type: "consumption", item: beans._id });
    expect(txCount).toBe(1);
  });

  it("blocks the status change and rolls back partial consumption when a later component is short", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const plentiful = await createTestInventoryItem({ name: "Plentiful", currentStock: 1000, avgCost: 1 });
    const scarce = await createTestInventoryItem({ name: "Scarce", currentStock: 1, avgCost: 1 });
    await Recipe.create({
      product: product.productId,
      variant: "",
      components: [
        { item: plentiful._id, quantity: 10 },
        { item: scarce._id, quantity: 10 }, // needs 10, only 1 available
      ],
    });

    const order = await placeOrder(product, "250g", 1);
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Packaging" });

    expect(res.status).toBe(400);

    const dbOrder = await Order.findOne({ orderId: order.id });
    expect(dbOrder.status).toBe("Received");
    expect(dbOrder.rawMaterialsConsumedAt).toBeNull();

    // The plentiful component's consumption (which succeeded before the
    // scarce one failed) must have been rolled back, not left applied.
    const plentifulAfter = await InventoryItem.findById(plentiful._id);
    expect(plentifulAfter.currentStock).toBe(1000);
    const scarceAfter = await InventoryItem.findById(scarce._id);
    expect(scarceAfter.currentStock).toBe(1);
  });

  it("does nothing for a product with no recipe", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const order = await placeOrder(product, "250g", 2);
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Packaging" });

    expect(res.status).toBe(200);
    expect(res.body.data.rawMaterialsConsumedAt).not.toBeNull(); // evaluated, just had nothing to consume

    const consumptionCount = await InventoryTransaction.countDocuments({ type: "consumption" });
    expect(consumptionCount).toBe(0);
  });

  it("also consumes via the advance-status endpoint", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const item = await createTestInventoryItem({ name: "Wrap", currentStock: 50, avgCost: 0.5 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: item._id, quantity: 2 }] });

    const order = await placeOrder(product, "250g", 4);
    const { cookie } = await loginAdmin();

    // Received -> Roasting (no consumption yet)
    await request(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", cookie);
    expect((await InventoryItem.findById(item._id)).currentStock).toBe(50);

    // Roasting -> Packaging (consumption fires here)
    const res = await request(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Packaging");
    expect((await InventoryItem.findById(item._id)).currentStock).toBe(50 - 2 * 4);
  });
});

describe("Order cancellation/refund -> raw-material reversal", () => {
  it("credits consumed materials back when cancelled while still in Packaging (not yet shipped)", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const beans = await createTestInventoryItem({ currentStock: 100, avgCost: 2 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 5 }] });

    const order = await placeOrder(product, "250g", 3);
    const { cookie } = await loginAdmin();

    await request(app).patch(`/api/admin/orders/${order.id}`).set("Cookie", cookie).send({ status: "Packaging" });
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(85); // 100 - 15

    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Cancelled", cancelReason: "customer changed mind" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.rawMaterialsReversedAt).not.toBeNull();
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(100); // fully restored

    const returnTx = await InventoryTransaction.findOne({ item: beans._id, type: "return" });
    expect(returnTx.quantityChange).toBe(15);

    const dbOrder = await Order.findOne({ orderId: order.id });
    expect(dbOrder.rawMaterialsReversedAt).not.toBeNull();
  });

  it("does NOT reverse consumption once the order has already shipped", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const beans = await createTestInventoryItem({ currentStock: 100, avgCost: 2 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 5 }] });

    const order = await placeOrder(product, "250g", 2);
    const { cookie } = await loginAdmin();

    await request(app).patch(`/api/admin/orders/${order.id}`).set("Cookie", cookie).send({ status: "Packaging" });
    await request(app).patch(`/api/admin/orders/${order.id}`).set("Cookie", cookie).send({ status: "Shipped" });
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(90); // 100 - 10

    const refundRes = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Refunded", refundReason: "damaged in transit" });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.rawMaterialsReversedAt).toBeNull();
    // Stock stays exactly as it was after shipping — the material is gone with the product.
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(90);
  });

  it("never reverses twice, even across multiple cancel-ish transitions", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const beans = await createTestInventoryItem({ currentStock: 50, avgCost: 1 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 4 }] });

    const order = await placeOrder(product, "250g", 1);
    const { cookie } = await loginAdmin();

    await request(app).patch(`/api/admin/orders/${order.id}`).set("Cookie", cookie).send({ status: "Packaging" });
    await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Cancelled", cancelReason: "test" });
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(50); // fully restored once

    // Re-cancelling (idempotent no-op path) must not credit stock a second time.
    await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Cancelled", cancelReason: "test again" });
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(50);

    const returnTxCount = await InventoryTransaction.countDocuments({ item: beans._id, type: "return" });
    expect(returnTxCount).toBe(1);
  });

  it("does nothing when the order never reached Packaging (nothing was ever consumed)", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const beans = await createTestInventoryItem({ currentStock: 20, avgCost: 1 });
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: beans._id, quantity: 4 }] });

    const order = await placeOrder(product, "250g", 1);
    const { cookie } = await loginAdmin();

    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${order.id}`)
      .set("Cookie", cookie)
      .send({ status: "Cancelled", cancelReason: "test" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.rawMaterialsReversedAt).toBeNull();
    expect((await InventoryItem.findById(beans._id)).currentStock).toBe(20);
  });
});
