const { app, request, registerAndLoginUser, loginAdmin, createTestProduct, createTestInventoryItem } = require("./helpers");
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

describe("Admin packing slip", () => {
  it("requires admin auth", async () => {
    const res = await request(app).get("/api/admin/orders/1/packing-slip");
    expect(res.status).toBe(401);
  });

  it("lists only non-raw-material components as the checklist, with no cost fields anywhere", async () => {
    const product = await createTestProduct({ basePrice: 15 });
    const beans = await createTestInventoryItem({ type: "raw_material", avgCost: 5 });
    const box = await createTestInventoryItem({ type: "packaging", avgCost: 0.75 });
    const label = await createTestInventoryItem({ type: "consumable", avgCost: 0.1 });

    await Recipe.create({
      product: product.productId,
      variant: "",
      components: [
        { item: beans._id, quantity: 3 },
        { item: box._id, quantity: 1 },
        { item: label._id, quantity: 2 },
      ],
    });

    const { token, phoneNumber } = await registerAndLoginUser();
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.productId, variant: "250g", quantity: 2 }], shipping: shippingFor(phoneNumber) });
    const order = orderRes.body.data;

    const { cookie } = await loginAdmin();
    const slipRes = await request(app).get(`/api/admin/orders/${order.id}/packing-slip`).set("Cookie", cookie);

    expect(slipRes.status).toBe(200);
    const slip = slipRes.body.data;
    expect(slip.orderCode).toBe(order.orderCode);
    expect(slip.items).toHaveLength(1);

    const checklist = slip.items[0].packagingChecklist;
    expect(checklist).toHaveLength(2); // box + label, not beans
    const boxEntry = checklist.find((c) => c.name === box.name);
    expect(boxEntry.quantity).toBe(2); // 1 * order quantity 2
    const labelEntry = checklist.find((c) => c.name === label.name);
    expect(labelEntry.quantity).toBe(4); // 2 * 2
    expect(checklist.find((c) => c.name === beans.name)).toBeUndefined();

    // No cost/price data anywhere in the response.
    const raw = JSON.stringify(slipRes.body);
    expect(raw).not.toMatch(/unitCost|avgCost|totalCost|price/i);
  });

  it("returns an empty checklist for a product with no recipe", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const { token, phoneNumber } = await registerAndLoginUser();
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.productId, variant: "250g", quantity: 1 }], shipping: shippingFor(phoneNumber) });
    const order = orderRes.body.data;

    const { cookie } = await loginAdmin();
    const slipRes = await request(app).get(`/api/admin/orders/${order.id}/packing-slip`).set("Cookie", cookie);

    expect(slipRes.status).toBe(200);
    expect(slipRes.body.data.items[0].packagingChecklist).toEqual([]);
  });
});
