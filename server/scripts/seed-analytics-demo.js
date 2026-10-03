// Builds a synthetic year of FarmConnect activity for demoing and developing the analytics dashboard.
// It wipes the target database, so it only runs against a database whose name ends in "_demo":
//   MONGO_URI=mongodb://127.0.0.1:27017/farmconnect_analytics_demo npm run server:seed:analytics-demo
// Then start the API with the same MONGO_URI and sign in to the admin as admin@demo.farmconnect / password123.
import mongoose from "mongoose";

import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";
import { resolveCounty } from "../utils/regions.js";

const uri = process.env.MONGO_URI;
if (!/_demo(\?|$)/.test(uri ?? "")) {
  throw new Error('Refusing to run: MONGO_URI must point at a database whose name ends in "_demo". This script deletes everything in it.');
}

let seed = 42;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (items) => items[Math.floor(random() * items.length)];
const weighted = (entries) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  return entries.find(([, weight]) => (roll -= weight) <= 0)[0];
};
const DAY = 86_400_000;
const now = Date.now();
// Growth curve: more activity recently.
const dateInLastYear = () => new Date(now - Math.pow(random(), 1.8) * 365 * DAY);
// A moment up to 20 days after `date`, never in the future.
const after = (date) => new Date(date.getTime() + random() * Math.min(20 * DAY, now - date.getTime()));

const places = [
  ["Njoro, Nakuru", 14], ["Naivasha", 6], ["Eldoret", 12], ["Kitale", 8], ["Thika", 9], ["Kiambu", 6],
  ["Westlands, Nairobi", 10], ["Nairobi", 8], ["Nyeri", 7], ["Karatina", 3], ["Meru", 7], ["Kisumu", 6], ["Ahero, Kisumu", 3],
  ["Kericho", 5], ["Machakos", 4], ["Murang'a", 5], ["Kakamega", 4], ["Bungoma", 4], ["Embu", 3], ["Narok", 3], ["Kajiado", 3], ["Somewhere far", 2],
];
const firstNames = ["Wanjiru", "Otieno", "Kiprop", "Achieng", "Mutua", "Njeri", "Kamau", "Chebet", "Wafula", "Atieno", "Mwangi", "Jepkosgei", "Ouma", "Nyambura", "Kibet"];
const lastNames = ["Farms", "Kariuki", "Odhiambo", "Ruto", "Mutiso", "Wairimu", "Barasa", "Koech", "Omondi", "Gitau"];
const products = [
  ["Vegetables", "Tomatoes", "crate", 2600, 900], ["Vegetables", "Sukuma wiki", "bunch", 30, 12], ["Vegetables", "Onions", "kg", 90, 30],
  ["Vegetables", "Potatoes", "bag", 3200, 900], ["Fruits", "Hass avocados", "crate", 1800, 500], ["Fruits", "Mangoes", "crate", 1500, 400],
  ["Grains", "Dry maize", "bag", 4200, 700], ["Grains", "Beans", "kg", 150, 35], ["Dairy", "Fresh milk", "litre", 55, 12],
  ["Farm inputs", "DAP fertiliser", "bag", 3500, 500], ["Farm inputs", "Certified maize seed", "kg", 420, 80], ["Fish", "Tilapia", "kg", 480, 120],
];
const topics = [["Crop care", 30], ["Livestock", 18], ["Pricing", 16], ["Farm inputs", 14], ["Market access", 12], ["Trade trust", 6], ["Cold chain", 4]];

await mongoose.connect(uri);
await mongoose.connection.db.dropDatabase();

const admin = await User.create({ name: "Demo Admin", email: "admin@demo.farmconnect", password: "password123", role: "buyer", location: "Nairobi", isAdmin: true });

const userDocs = Array.from({ length: 420 }, (_, index) => {
  const location = weighted(places);
  const role = weighted([["farmer", 55], ["buyer", 35], ["hobbyist", 10]]);
  const createdAt = dateInLastYear();
  return {
    name: `${pick(firstNames)} ${pick(lastNames)} ${index}`,
    email: `user${index}@demo.farmconnect`,
    password: "not-a-real-hash",
    role,
    location,
    county: resolveCounty(location),
    phone: random() > 0.3 ? `+2547${String(10000000 + index).slice(-8)}` : "",
    verificationStatus: role === "farmer" && random() > 0.55 ? "verified" : "unverified",
    trustScore: Math.round((1.5 + random() * 3) * 10) / 10,
    createdAt,
    updatedAt: createdAt,
  };
});
const users = await User.insertMany(userDocs);
const farmers = users.filter((user) => user.role === "farmer");

// County price premiums so the regional comparison has a story (Nairobi pays more, producing areas less).
const premium = { Nairobi: 1.25, Kiambu: 1.1, Nakuru: 0.9, "Uasin Gishu": 0.85, "Trans Nzoia": 0.85, Meru: 0.95 };
const productDocs = Array.from({ length: 260 }, () => {
  const seller = pick(farmers);
  const [category, name, unit, base, spread] = pick(products);
  const createdAt = after(seller.createdAt);
  const price = Math.round(((base + (random() - 0.5) * spread) * (premium[seller.county] ?? 1)) / 10) * 10;
  return { seller: seller._id, name, category, unit, price, stock: Math.floor(random() * 200), location: seller.location, county: seller.county, description: `${name} from ${seller.location}`, sellerType: "farmer", createdAt, updatedAt: createdAt };
});
const listings = await Product.insertMany(productDocs);

const postDocs = Array.from({ length: 320 }, () => {
  const author = pick(users);
  const createdAt = after(author.createdAt);
  return { author: author._id, headline: "Field note", body: "Demo content", tag: pick(["Crop health", "Market tea", "Farm inputs", "Buyer demand"]), location: author.location, county: author.county, createdAt, updatedAt: createdAt };
});
const posts = await Post.insertMany(postDocs);

const threadDocs = Array.from({ length: 240 }, () => {
  const author = pick(users);
  const createdAt = after(author.createdAt);
  return { author: author._id, title: "Demo question", body: "Demo", preview: "Demo", category: weighted(topics), repliesCount: 0, viewsCount: Math.floor(random() * 300), createdAt, updatedAt: createdAt };
});
const threads = await CommunityThread.insertMany(threadDocs);

const replyDocs = [];
threads.forEach((thread) => {
  const replies = weighted([[0, 22], [1, 25], [2, 20], [3, 15], [5, 10], [8, 8]]);
  thread.repliesCount = replies;
  for (let index = 0; index < replies; index += 1) {
    const createdAt = after(thread.createdAt);
    replyDocs.push({ thread: thread._id, author: pick(users)._id, body: "Demo answer", createdAt, updatedAt: createdAt });
  }
});
await ThreadReply.insertMany(replyDocs);
await Promise.all(threads.map((thread) => CommunityThread.updateOne({ _id: thread._id }, { repliesCount: thread.repliesCount })));

await Comment.insertMany(
  Array.from({ length: 500 }, () => {
    const post = pick(posts);
    const createdAt = after(post.createdAt);
    return { post: post._id, author: pick(users)._id, body: "Demo comment", createdAt, updatedAt: createdAt };
  })
);

const buyers = users.filter((user) => user.role !== "farmer");
const orderDocs = Array.from({ length: 380 }, () => {
  const product = pick(listings);
  const buyer = pick(buyers);
  const quantity = 1 + Math.floor(random() * 12);
  const createdAt = after(product.createdAt);
  const status = createdAt.getTime() > now - 5 * DAY ? weighted([["pending", 5], ["accepted", 3], ["in-transit", 2]]) : weighted([["delivered", 70], ["cancelled", 14], ["pending", 6], ["accepted", 5], ["in-transit", 5]]);
  return {
    buyer: buyer._id,
    seller: product.seller,
    items: [{ product: product._id, name: product.name, quantity, unitPrice: product.price, unit: product.unit }],
    totalAmount: quantity * product.price,
    status,
    deliveryLocation: buyer.location,
    county: buyer.county,
    createdAt,
    updatedAt: after(createdAt),
  };
});
await Order.insertMany(orderDocs);

console.log({ admin: admin.email, users: users.length, listings: listings.length, posts: posts.length, threads: threads.length, replies: replyDocs.length, orders: orderDocs.length });
await mongoose.disconnect();
