const { app, request, loginAdmin, createTestProduct, createTestCategory } = require("./helpers");

describe("Product/category list caching", () => {
  it("reflects a newly created product on the very next request (cache invalidated on write)", async () => {
    const category = await createTestCategory();
    const { cookie } = await loginAdmin();

    // Prime the cache with the pre-create state. createTestProduct() writes
    // directly via Mongoose (bypassing the API), which correctly does NOT
    // invalidate the cache — only writes through the controller do. So this
    // test goes through the real admin API, same as the other three below.
    const before = await request(app).get("/api/products");
    const beforeCount = before.body.data.pagination.total;

    await request(app)
      .post("/api/admin/products")
      .set("Cookie", cookie)
      .send({
        name: "Cache Test Product",
        category: String(category._id),
        basePrice: 10,
        notes: "n",
        description: "d",
        origin: "o",
      });

    const after = await request(app).get("/api/products");
    expect(after.body.data.pagination.total).toBe(beforeCount + 1);
  });

  it("reflects a deleted product on the very next request", async () => {
    const product = await createTestProduct();
    const { cookie } = await loginAdmin();

    // Prime the cache.
    const before = await request(app).get("/api/products");
    const beforeCount = before.body.data.pagination.total;

    await request(app).delete(`/api/admin/products/${product.productId}`).set("Cookie", cookie);

    const after = await request(app).get("/api/products");
    expect(after.body.data.pagination.total).toBe(beforeCount - 1);
  });

  it("reflects a newly created category on the very next request", async () => {
    const { cookie } = await loginAdmin();

    const before = await request(app).get("/api/categories");
    const beforeCount = before.body.data.length;

    await request(app)
      .post("/api/admin/categories")
      .set("Cookie", cookie)
      .send({ name: `Cache Test Category ${Date.now()}` });

    const after = await request(app).get("/api/categories");
    expect(after.body.data.length).toBe(beforeCount + 1);
  });

  it("reflects a category rename in a subsequently cached product list's filters", async () => {
    const category = await createTestCategory("Original Name");
    await createTestProduct({ category });
    const { cookie } = await loginAdmin();

    // Prime the product-list cache (it embeds category names in `filters.categories`).
    const before = await request(app).get("/api/products");
    expect(before.body.data.filters.categories).toContain("Original Name");

    await request(app)
      .patch(`/api/admin/categories/${category._id}`)
      .set("Cookie", cookie)
      .send({ name: "Renamed" });

    const after = await request(app).get("/api/products");
    expect(after.body.data.filters.categories).toContain("Renamed");
    expect(after.body.data.filters.categories).not.toContain("Original Name");
  });
});
