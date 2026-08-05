const { app, request, registerAndLoginUser, createTestProduct } = require("./helpers");

describe("POST /api/cart/items — price trust (guest cart)", () => {
  it("ignores a client-supplied price and charges the real product price", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const sessionId = `test-session-${Date.now()}`;

    const res = await request(app)
      .post("/api/cart/items")
      .send({
        sessionId,
        item: { id: product.productId, quantity: 1, variant: "250g", price: 0.01, name: "HACKED" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].price).toBe(16);
    expect(res.body.data.items[0].name).toBe(product.name);
    expect(res.body.data.cartTotal).toBe(16);
  });

  it("rejects an unrecognized variant with 400", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const sessionId = `test-session-${Date.now()}`;

    const res = await request(app)
      .post("/api/cart/items")
      .send({ sessionId, item: { id: product.productId, quantity: 1, variant: "not-real" } });

    expect(res.status).toBe(400);
  });

  it("requires a sessionId for a guest cart", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const res = await request(app)
      .post("/api/cart/items")
      .send({ item: { id: product.productId, quantity: 1, variant: "250g" } });

    expect(res.status).toBe(400);
  });
});

describe("Cart — guest session merges into user cart on login", () => {
  it("attaches a guest cart's items to the user's cart via /api/cart/attach-session", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const sessionId = `test-session-${Date.now()}`;

    await request(app)
      .post("/api/cart/items")
      .send({ sessionId, item: { id: product.productId, quantity: 2, variant: "250g" } });

    const { token } = await registerAndLoginUser();

    const attachRes = await request(app)
      .post("/api/cart/attach-session")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId });

    expect(attachRes.status).toBe(200);
    expect(attachRes.body.data.items).toHaveLength(1);
    expect(attachRes.body.data.items[0].quantity).toBe(2);

    const userCartRes = await request(app).get("/api/cart/me").set("Authorization", `Bearer ${token}`);
    expect(userCartRes.body.data.items).toHaveLength(1);

    // Guest cart should be gone after attaching.
    const guestCartRes = await request(app).get("/api/cart").query({ sessionId });
    expect(guestCartRes.body.data.items).toHaveLength(0);
  });
});

describe("PATCH /api/cart/items — update quantity", () => {
  it("updates quantity without touching price", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const sessionId = `test-session-${Date.now()}`;

    await request(app)
      .post("/api/cart/items")
      .send({ sessionId, item: { id: product.productId, quantity: 1, variant: "250g" } });

    const res = await request(app)
      .patch("/api/cart/items")
      .send({ sessionId, productId: product.productId, variant: "250g", quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.items[0].price).toBe(16);
  });
});
