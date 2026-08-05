const { app, request, registerAndLoginUser, loginAdmin, createTestProduct } = require("./helpers");
const Coupon = require("../src/models/Coupon");

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

describe("Coupon percent-off math (regression for a real pre-existing bug)", () => {
  // Before services/couponService.js existed, orderController.js hardcoded
  // percent coupons and computed `orderAmount * coupon.value` where value
  // was stored as a whole number (20 for "20%") — i.e. a 2000% "discount",
  // not 20%. Applying AURA20 always made the order total negative and
  // order creation always failed with 400 "Total must be a valid positive
  // number". Verified live against the real dev database before this fix
  // existed. These tests exist so that specific bug can never come back
  // silently.
  it("computes a 20% coupon as 20% of the order amount, not 2000%", async () => {
    await Coupon.create({ code: "TEST20", type: "percent", value: 20, label: "20% off" });
    const subtotal = "18.5";

    const res = await request(app).get("/api/coupons/validate").query({ code: "TEST20", subtotal });
    expect(res.status).toBe(200);

    const shippingFee = 5;
    const tax = Math.round(Number(subtotal) * 0.08 * 100) / 100;
    const orderAmount = Number(subtotal) + shippingFee + tax;
    const expectedDiscount = Math.round(orderAmount * 0.2 * 100) / 100;

    expect(res.body.data.discountAmount).toBe(expectedDiscount);
    expect(res.body.data.discountAmount).toBeLessThan(orderAmount);
  });

  it("allows an order to actually complete using a percent coupon", async () => {
    await Coupon.create({ code: "TEST20", type: "percent", value: 20, label: "20% off" });
    const product = await createTestProduct({ basePrice: 18.5 });
    const { token, phoneNumber } = await registerAndLoginUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.productId, variant: "250g", quantity: 1 }],
        couponCode: "TEST20",
        shipping: shippingFor(phoneNumber),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.discountAmount).toBeGreaterThan(0);
    expect(res.body.data.discountAmount).toBeLessThan(res.body.data.subtotal + res.body.data.shippingFee + res.body.data.tax);
  });

  it("increments usedCount after a successful order", async () => {
    const coupon = await Coupon.create({ code: "TEST20", type: "percent", value: 20, label: "20% off" });
    const product = await createTestProduct({ basePrice: 18.5 });
    const { token, phoneNumber } = await registerAndLoginUser();

    await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.productId, variant: "250g", quantity: 1 }],
        couponCode: "TEST20",
        shipping: shippingFor(phoneNumber),
      });

    const updated = await Coupon.findById(coupon._id);
    expect(updated.usedCount).toBe(1);
  });
});

describe("Coupon validation edge cases", () => {
  it("rejects an unknown coupon code with 400", async () => {
    const res = await request(app).get("/api/coupons/validate").query({ code: "NOPE", subtotal: "10" });
    expect(res.status).toBe(400);
  });

  it("rejects an inactive coupon", async () => {
    await Coupon.create({ code: "INACTIVE10", type: "flat", value: 10, label: "inactive", active: false });
    const res = await request(app).get("/api/coupons/validate").query({ code: "INACTIVE10", subtotal: "10" });
    expect(res.status).toBe(400);
  });

  it("rejects a coupon below its minOrderAmount", async () => {
    await Coupon.create({ code: "BIGORDER", type: "flat", value: 10, label: "big order only", minOrderAmount: 100 });
    const res = await request(app).get("/api/coupons/validate").query({ code: "BIGORDER", subtotal: "10" });
    expect(res.status).toBe(400);
  });

  it("rejects a coupon that has hit its maxUses", async () => {
    await Coupon.create({ code: "LIMITED", type: "flat", value: 10, label: "limited", maxUses: 1, usedCount: 1 });
    const res = await request(app).get("/api/coupons/validate").query({ code: "LIMITED", subtotal: "10" });
    expect(res.status).toBe(400);
  });

  it("does not list an expired coupon in the public active list", async () => {
    await Coupon.create({
      code: "EXPIRED",
      type: "flat",
      value: 10,
      label: "expired",
      expiresAt: new Date(Date.now() - 1000),
    });
    await Coupon.create({ code: "STILLGOOD", type: "flat", value: 10, label: "still good" });

    const res = await request(app).get("/api/coupons");
    const codes = res.body.data.map((c) => c.code);
    expect(codes).toContain("STILLGOOD");
    expect(codes).not.toContain("EXPIRED");
  });
});

describe("Admin coupon CRUD", () => {
  it("requires admin auth to create a coupon", async () => {
    const res = await request(app)
      .post("/api/admin/coupons")
      .send({ code: "HACK", type: "flat", value: 9999, label: "hack" });
    expect(res.status).toBe(401);
  });

  it("rejects a duplicate coupon code with 409", async () => {
    const { cookie } = await loginAdmin();
    await request(app)
      .post("/api/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "DUPTEST", type: "flat", value: 10, label: "first" });

    const res = await request(app)
      .post("/api/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "DUPTEST", type: "flat", value: 5, label: "second" });

    expect(res.status).toBe(409);
  });

  it("rejects a percent value over 100", async () => {
    const { cookie } = await loginAdmin();
    const res = await request(app)
      .post("/api/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "TOOBIG", type: "percent", value: 150, label: "too big" });
    expect(res.status).toBe(400);
  });

  it("creates, updates, and deletes a coupon end to end", async () => {
    const { cookie } = await loginAdmin();

    const created = await request(app)
      .post("/api/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "LIFECYCLE", type: "flat", value: 10, label: "lifecycle test" });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/admin/coupons/${created.body.data.id}`)
      .set("Cookie", cookie)
      .send({ active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.active).toBe(false);

    const deleted = await request(app)
      .delete(`/api/admin/coupons/${created.body.data.id}`)
      .set("Cookie", cookie);
    expect(deleted.status).toBe(200);

    const list = await request(app).get("/api/admin/coupons").set("Cookie", cookie);
    expect(list.body.data.find((c) => c.id === created.body.data.id)).toBeUndefined();
  });
});
