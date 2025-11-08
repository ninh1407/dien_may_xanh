import axios from "axios";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import Product from "../models/Product.js"; // đường dẫn tuỳ dự án
import Category from "../models/Category.js";

const BASE_URL = "https://www.dienmayxanh.com";

const categories = [
  { name: "Tivi", slug: "tivi" },
  { name: "Tủ lạnh", slug: "tu-lanh" },
  { name: "Máy giặt", slug: "may-giat" },
  { name: "Điện thoại", slug: "dien-thoai" },
  { name: "Laptop", slug: "laptop" },
  { name: "Máy lạnh", slug: "may-lanh" },
  { name: "Nồi cơm điện", slug: "noi-com-dien" }
];

async function crawlCategory(cat) {
  const url = `${BASE_URL}/${cat.slug}`;
  console.log(`🔍 Crawling ${url}`);

  const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const $ = cheerio.load(data);

  const products = [];
  $(".listproduct .item").each((_, el) => {
    const name = $(el).find("h3").text().trim();
    const priceText = $(el).find(".price").text().trim().replace(/[^\d]/g, "");
    const price = parseInt(priceText) || 0;
    const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
    const link = BASE_URL + ($(el).find("a").attr("href") || "");

    if (name && price && image) {
      products.push({ name, price, image, link, category: cat.name });
    }
  });

  console.log(`✅ ${products.length} sản phẩm từ ${cat.name}`);
  return products;
}

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/dien_may_xanh");
  console.log("📦 Connected to MongoDB");

  const allProducts = [];
  for (const cat of categories) {
    const data = await crawlCategory(cat);
    allProducts.push(...data);
  }
const detailRes = await axios.get(product.link);
const $d = cheerio.load(detailRes.data);
const specs = {};
$d(".parameter li").each((_, li) => {
  const key = $d(li).find("span").text().trim();
  const val = $d(li).contents().filter((_, c) => c.type === "text").text().trim();
  specs[key] = val;
});
product.specifications = specs;

  console.log(`💾 Tổng cộng: ${allProducts.length} sản phẩm`);
  await Product.insertMany(allProducts);

  console.log("🎉 Dữ liệu đã được lưu vào MongoDB!");
  await mongoose.disconnect();
}

main().catch(err => console.error(err));
