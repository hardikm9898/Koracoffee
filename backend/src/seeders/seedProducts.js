require("dotenv").config();

const connectDB = require("../config/db");
const Product = require("../models/Product");
const Category = require("../models/Category");
const productSeed = require("../data/productSeed");

const seedProducts = async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    await Category.deleteMany({});

    const categoryNames = [...new Set(productSeed.map((item) => String(item.category || "").trim()))].filter(Boolean);
    const categories = await Category.insertMany(categoryNames.map((name) => ({ name })));
    const categoryMap = categories.reduce((acc, category) => {
      acc[category.name] = category._id;
      return acc;
    }, {});

    const productsWithRefs = productSeed.map((product) => ({
      ...product,
      category: categoryMap[String(product.category || "").trim()],
    }));

    await Product.insertMany(productsWithRefs);
    console.log(`Seeded ${productSeed.length} products`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed products", error);
    process.exit(1);
  }
};

seedProducts();
