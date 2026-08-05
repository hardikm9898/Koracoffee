const { app, request, loginAdmin, createTestCategory, createTestProduct } = require("./helpers");
const Review = require("../src/models/Review");
const Product = require("../src/models/Product");

describe("Category delete — referential integrity", () => {
  it("blocks deleting a category still referenced by a product (409)", async () => {
    const category = await createTestCategory();
    await createTestProduct({ category });
    const { cookie } = await loginAdmin();

    const res = await request(app).delete(`/api/admin/categories/${category._id}`).set("Cookie", cookie);

    expect(res.status).toBe(409);
    const stillThere = await request(app).get("/api/categories");
    expect(stillThere.body.data.some((c) => c.id === String(category._id))).toBe(true);
  });

  it("allows deleting a category with no referencing products", async () => {
    const category = await createTestCategory();
    const { cookie } = await loginAdmin();

    const res = await request(app).delete(`/api/admin/categories/${category._id}`).set("Cookie", cookie);

    expect(res.status).toBe(200);
  });
});

describe("Product delete — cascades reviews", () => {
  it("deletes reviews associated with a deleted product", async () => {
    const product = await createTestProduct();
    await Review.create({
      productId: product.productId,
      name: "Reviewer",
      rating: 5,
      content: "Great coffee",
      status: "approved",
    });
    const { cookie } = await loginAdmin();

    const res = await request(app).delete(`/api/admin/products/${product.productId}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/1 associated review/);

    const remainingReviews = await Review.find({ productId: product.productId });
    expect(remainingReviews).toHaveLength(0);
    const remainingProduct = await Product.findOne({ productId: product.productId });
    expect(remainingProduct).toBeNull();
  });

  it("does not error when deleting a product with no reviews", async () => {
    const product = await createTestProduct();
    const { cookie } = await loginAdmin();

    const res = await request(app).delete(`/api/admin/products/${product.productId}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).not.toMatch(/review/);
  });
});
