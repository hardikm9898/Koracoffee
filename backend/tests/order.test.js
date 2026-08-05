const {
  app,
  request,
  registerAndLoginUser,
  createTestProduct,
} = require("./helpers");
const Product = require("../src/models/Product");

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

describe("POST /api/orders — price trust", () => {
  it("ignores a client-supplied price and charges the real product price", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const { token, phoneNumber } = await registerAndLoginUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          { productId: product.productId, variant: "250g", quantity: 1, price: 0.01, name: "HACKED" },
        ],
        shipping: shippingFor(phoneNumber),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].price).toBe(16); // 250g fallback multiplier is 1.0x basePrice
    expect(res.body.data.items[0].name).toBe(product.name); // not "HACKED"
    expect(res.body.data.subtotal).toBe(16);
  });

  it("applies the 100g fallback multiplier (0.5x) for products with no variants", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const { token, phoneNumber } = await registerAndLoginUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.productId, variant: "100g", quantity: 1, price: 999 }],
        shipping: shippingFor(phoneNumber),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].price).toBe(8);
  });

  it("rejects an unrecognized variant with 400", async () => {
    const product = await createTestProduct({ basePrice: 16 });
    const { token, phoneNumber } = await registerAndLoginUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.productId, variant: "not-a-real-variant", quantity: 1 }],
        shipping: shippingFor(phoneNumber),
      });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/orders — auth and scoping", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/orders").send({
      items: [{ productId: 1, variant: "250g", quantity: 1 }],
      shipping: shippingFor("9999999999"),
    });
    expect(res.status).toBe(401);
  });

  it("scopes GET /api/orders to the requesting user only", async () => {
    const product = await createTestProduct({ basePrice: 10 });
    const userA = await registerAndLoginUser("User A");
    const userB = await registerAndLoginUser("User B");

    await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        items: [{ productId: product.productId, variant: "250g", quantity: 1 }],
        shipping: shippingFor(userA.phoneNumber),
      });

    const asA = await request(app).get("/api/orders").set("Authorization", `Bearer ${userA.token}`);
    const asB = await request(app).get("/api/orders").set("Authorization", `Bearer ${userB.token}`);

    expect(asA.body.data.items).toHaveLength(1);
    expect(asB.body.data.items).toHaveLength(0);
  });

  it("rejects PATCH on the public order router — status mutation is admin-only", async () => {
    const { token } = await registerAndLoginUser();
    const res = await request(app)
      .patch("/api/orders/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Delivered" });
    expect(res.status).toBe(404); // route doesn't exist on this router at all
  });
});

describe("POST /api/orders — atomic stock decrement", () => {
  it("allows exactly one of several concurrent orders to succeed for 1 unit of stock", async () => {
    const product = await createTestProduct({
      basePrice: 10,
      variants: [{ label: "Test-5g", price: 10, stock: 1 }],
    });
    const { token, phoneNumber } = await registerAndLoginUser();

    const placeOrder = () =>
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [{ productId: product.productId, variant: "Test-5g", quantity: 1 }],
          shipping: shippingFor(phoneNumber),
        });

    const results = await Promise.all([placeOrder(), placeOrder(), placeOrder(), placeOrder(), placeOrder()]);

    const succeeded = results.filter((r) => r.status === 201);
    const failed = results.filter((r) => r.status === 400);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(4);

    const finalProduct = await Product.findOne({ productId: product.productId });
    expect(finalProduct.variants[0].stock).toBe(0);
  });

  it("rolls back an earlier item's stock decrement when a later item fails", async () => {
    const productA = await createTestProduct({
      basePrice: 10,
      variants: [{ label: "Test-5g", price: 10, stock: 5 }],
    });
    const productB = await createTestProduct({
      basePrice: 10,
      variants: [{ label: "Test-5g", price: 10, stock: 0 }],
    });
    const { token, phoneNumber } = await registerAndLoginUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          { productId: productA.productId, variant: "Test-5g", quantity: 2 },
          { productId: productB.productId, variant: "Test-5g", quantity: 1 },
        ],
        shipping: shippingFor(phoneNumber),
      });

    expect(res.status).toBe(400);

    const finalA = await Product.findOne({ productId: productA.productId });
    expect(finalA.variants[0].stock).toBe(5); // restored, not left at 3
  });
});
