const { app, request, loginAdmin, createTestInventoryItem, createTestProduct } = require("./helpers");
const { resolveRecipe, computeRecipeCost } = require("../src/services/recipeService");
const Recipe = require("../src/models/Recipe");

describe("Admin recipes / BOM", () => {
  it("requires admin auth", async () => {
    const res = await request(app).get("/api/admin/recipes");
    expect(res.status).toBe(401);
  });

  it("creates a recipe and computes estimated cost from current avgCost", async () => {
    const product = await createTestProduct();
    const beans = await createTestInventoryItem({ name: "Beans", avgCost: 2 });
    const box = await createTestInventoryItem({ name: "Box", avgCost: 0.5 });
    const { cookie } = await loginAdmin();

    const res = await request(app)
      .post("/api/admin/recipes")
      .set("Cookie", cookie)
      .send({
        product: product.productId,
        components: [
          { itemId: beans.itemId, quantity: 0.2 },
          { itemId: box.itemId, quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    // 0.2*2 + 1*0.5 = 0.9
    expect(res.body.data.estimatedCost).toBe(0.9);
    expect(res.body.data.components).toHaveLength(2);
  });

  it("rejects a second active recipe for the same product+variant", async () => {
    const product = await createTestProduct();
    const item = await createTestInventoryItem();
    const { cookie } = await loginAdmin();

    await request(app)
      .post("/api/admin/recipes")
      .set("Cookie", cookie)
      .send({ product: product.productId, components: [{ itemId: item.itemId, quantity: 1 }] });

    const dupRes = await request(app)
      .post("/api/admin/recipes")
      .set("Cookie", cookie)
      .send({ product: product.productId, components: [{ itemId: item.itemId, quantity: 2 }] });

    expect(dupRes.status).toBe(400);
  });

  it("allows a variant-specific recipe alongside a product-wide one, and resolves the specific one first", async () => {
    const product = await createTestProduct();
    const itemA = await createTestInventoryItem({ name: "Generic material", avgCost: 1 });
    const itemB = await createTestInventoryItem({ name: "250g-specific material", avgCost: 5 });

    await Recipe.create({ product: product.productId, variant: "", components: [{ item: itemA._id, quantity: 1 }] });
    await Recipe.create({
      product: product.productId,
      variant: "250g",
      components: [{ item: itemB._id, quantity: 1 }],
    });

    const resolvedSpecific = await resolveRecipe(product.productId, "250g");
    expect(String(resolvedSpecific.components[0].item._id)).toBe(String(itemB._id));

    const resolvedFallback = await resolveRecipe(product.productId, "500g");
    expect(String(resolvedFallback.components[0].item._id)).toBe(String(itemA._id));
  });

  it("returns null when no recipe exists for a product", async () => {
    const resolved = await resolveRecipe(999999, "any");
    expect(resolved).toBeNull();
  });

  it("ignores an inactive recipe when resolving", async () => {
    const product = await createTestProduct();
    const item = await createTestInventoryItem();
    await Recipe.create({ product: product.productId, variant: "", components: [{ item: item._id, quantity: 1 }], active: false });

    const resolved = await resolveRecipe(product.productId, "any-variant");
    expect(resolved).toBeNull();
  });
});
