import { AdminAction } from "../../models/admin-action.model.js";
import { Comment } from "../../models/comment.model.js";
import { CommunityThread } from "../../models/community-thread.model.js";
import { notRemoved } from "../../models/moderation-fields.js";
import { Order } from "../../models/order.model.js";
import { Post } from "../../models/post.model.js";
import { Product } from "../../models/product.model.js";
import { ThreadReply } from "../../models/thread-reply.model.js";
import { User } from "../../models/user.model.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { KENYA_COUNTIES } from "../../utils/regions.js";

/**
 * Admin analytics.
 *
 * Everything here is aggregate. The CSV export additionally suppresses small counts so that
 * figures shared with partners can't be traced back to individual farmers.
 */
const TIMEZONE = "Africa/Nairobi";
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000; // Kenya has no daylight saving.
const ALLOWED_DAYS = [7, 30, 90, 365];
const SUPPRESSION_THRESHOLD = 5;
const MIN_LISTINGS_FOR_PRICE = 3;

function parseRange(query) {
  const days = ALLOWED_DAYS.includes(Number(query.days)) ? Number(query.days) : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const previousFrom = new Date(from.getTime() - days * 86_400_000);
  const unit = days <= 31 ? "day" : days <= 120 ? "week" : "month";
  return { days, from, to, previousFrom, unit };
}

function parseCounty(query) {
  if (!query.county || query.county === "all") return undefined;
  return query.county === "unknown" ? null : query.county;
}

/** Bucket start in Nairobi time, matching Mongo's $dateTrunc (weeks start on Monday). */
function bucketStart(date, unit) {
  const local = new Date(date.getTime() + NAIROBI_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  if (unit === "week") local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  if (unit === "month") local.setUTCDate(1);
  return new Date(local.getTime() - NAIROBI_OFFSET_MS);
}

function bucketList(from, to, unit) {
  const buckets = [];
  for (let cursor = bucketStart(from, unit); cursor <= to; ) {
    buckets.push(cursor);
    const local = new Date(cursor.getTime() + NAIROBI_OFFSET_MS);
    if (unit === "day") local.setUTCDate(local.getUTCDate() + 1);
    if (unit === "week") local.setUTCDate(local.getUTCDate() + 7);
    if (unit === "month") local.setUTCMonth(local.getUTCMonth() + 1);
    cursor = new Date(local.getTime() - NAIROBI_OFFSET_MS);
  }
  return buckets;
}

const truncate = (unit) => ({ $dateTrunc: { date: "$createdAt", unit, timezone: TIMEZONE, startOfWeek: "monday" } });

/** Count (and optionally sum a field) per time bucket. */
async function seriesFor(Model, match, unit, sumField) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: truncate(unit), count: { $sum: 1 }, ...(sumField ? { total: { $sum: `$${sumField}` } } : {}) } },
  ]);
  return new Map(rows.map((row) => [row._id.getTime(), row]));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Filters that scope each collection to one county (people by home county, orders by either party). */
async function countyScope(county) {
  if (county === undefined) {
    return { users: {}, authored: {}, products: {}, posts: {}, orders: {} };
  }

  const ids = (await User.find({ county }).select("_id").lean()).map((user) => user._id);
  return {
    users: { county },
    authored: { author: { $in: ids } },
    products: { county },
    posts: { county },
    orders: { $or: [{ county }, { seller: { $in: ids } }, { buyer: { $in: ids } }] },
  };
}

const inRange = (from, to) => ({ createdAt: { $gte: from, $lt: to } });

async function kpisFor(scope, from, to) {
  const range = inRange(from, to);
  const [newFarmers, newBuyers, threads, listingsAdded, orderStats, authors] = await Promise.all([
    User.countDocuments({ ...scope.users, ...range, role: "farmer", accountStatus: { $ne: "deleted" } }),
    User.countDocuments({ ...scope.users, ...range, role: { $in: ["buyer", "hobbyist"] }, accountStatus: { $ne: "deleted" } }),
    CommunityThread.find({ ...scope.authored, ...range, ...notRemoved }).select("repliesCount").lean(),
    Product.countDocuments({ ...scope.products, ...range }),
    Order.aggregate([
      { $match: { ...scope.orders, ...range } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          requestedValue: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalAmount", 0] } },
          deliveredValue: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0] } },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]),
    Promise.all([
      Post.distinct("author", { ...scope.posts, ...range }),
      CommunityThread.distinct("author", { ...scope.authored, ...range }),
      ThreadReply.distinct("author", { ...scope.authored, ...range }),
      Comment.distinct("author", { ...scope.authored, ...range }),
    ]),
  ]);

  const answered = threads.filter((thread) => thread.repliesCount > 0).length;
  const orders = orderStats[0] ?? { orders: 0, requestedValue: 0, deliveredValue: 0, delivered: 0, cancelled: 0 };

  return {
    newFarmers,
    newBuyers,
    activeContributors: new Set(authors.flat().map(String)).size,
    questions: threads.length,
    answerRate: threads.length ? Math.round((answered / threads.length) * 100) : null,
    listingsAdded,
    orders: orders.orders,
    requestedValue: orders.requestedValue,
    deliveredValue: orders.deliveredValue,
    completionRate: orders.orders ? Math.round((orders.delivered / orders.orders) * 100) : null,
    cancellationRate: orders.orders ? Math.round((orders.cancelled / orders.orders) * 100) : null,
  };
}

async function seriesForRange(scope, from, to, unit) {
  const range = inRange(from, to);
  const [farmers, others, posts, threads, replies, comments, orders, delivered] = await Promise.all([
    seriesFor(User, { ...scope.users, ...range, role: "farmer" }, unit),
    seriesFor(User, { ...scope.users, ...range, role: { $in: ["buyer", "hobbyist"] } }, unit),
    seriesFor(Post, { ...scope.posts, ...range }, unit),
    seriesFor(CommunityThread, { ...scope.authored, ...range }, unit),
    seriesFor(ThreadReply, { ...scope.authored, ...range }, unit),
    seriesFor(Comment, { ...scope.authored, ...range }, unit),
    seriesFor(Order, { ...scope.orders, ...range }, unit),
    seriesFor(Order, { ...scope.orders, ...range, status: "delivered" }, unit, "totalAmount"),
  ]);

  const count = (map, key) => map.get(key)?.count ?? 0;

  return bucketList(from, to, unit).map((bucket) => {
    const key = bucket.getTime();
    return {
      bucket: bucket.toISOString(),
      newFarmers: count(farmers, key),
      newBuyers: count(others, key),
      posts: count(posts, key),
      questions: count(threads, key),
      answers: count(replies, key) + count(comments, key),
      orders: count(orders, key),
      deliveredValue: delivered.get(key)?.total ?? 0,
    };
  });
}

/** One row per county: who is there, what they sell, and what happened in the range. */
async function regionsFor(from, to) {
  const range = inRange(from, to);
  const byAuthorCounty = (Model, extra = {}) =>
    Model.aggregate([
      { $match: { ...range, ...extra } },
      { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
      { $group: { _id: { $ifNull: [{ $first: "$author.county" }, null] }, count: { $sum: 1 }, unanswered: { $sum: { $cond: [{ $eq: ["$repliesCount", 0] }, 1, 0] } } } },
    ]);

  const [people, listings, sales, demand, questions, answers] = await Promise.all([
    User.aggregate([
      { $match: { accountStatus: "active" } },
      {
        $group: {
          _id: "$county",
          farmers: { $sum: { $cond: [{ $eq: ["$role", "farmer"] }, 1, 0] } },
          buyers: { $sum: { $cond: [{ $ne: ["$role", "farmer"] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $in: ["$verificationStatus", ["verified", "top-rated"]] }, 1, 0] } },
        },
      },
    ]),
    Product.aggregate([{ $match: notRemoved }, { $group: { _id: "$county", listings: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...range, status: { $ne: "cancelled" } } },
      { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "seller" } },
      {
        $group: {
          _id: { $ifNull: [{ $first: "$seller.county" }, null] },
          sales: { $sum: 1 },
          salesValue: { $sum: "$totalAmount" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...range, status: { $ne: "cancelled" } } },
      { $group: { _id: "$county", purchases: { $sum: 1 }, purchaseValue: { $sum: "$totalAmount" } } },
    ]),
    byAuthorCounty(CommunityThread, notRemoved),
    byAuthorCounty(ThreadReply),
  ]);

  const rows = new Map();
  const row = (county) => {
    const key = county ?? "Unknown";
    if (!rows.has(key)) {
      rows.set(key, {
        county: key,
        farmers: 0,
        buyers: 0,
        verified: 0,
        listings: 0,
        sales: 0,
        salesValue: 0,
        purchases: 0,
        purchaseValue: 0,
        questions: 0,
        unanswered: 0,
        answers: 0,
      });
    }
    return rows.get(key);
  };

  people.forEach(({ _id, farmers, buyers, verified }) => Object.assign(row(_id), { farmers, buyers, verified }));
  listings.forEach(({ _id, listings: count }) => (row(_id).listings = count));
  sales.forEach(({ _id, sales: count, salesValue }) => Object.assign(row(_id), { sales: count, salesValue }));
  demand.forEach(({ _id, purchases, purchaseValue }) => Object.assign(row(_id), { purchases, purchaseValue }));
  questions.forEach(({ _id, count, unanswered }) => Object.assign(row(_id), { questions: count, unanswered }));
  answers.forEach(({ _id, count }) => (row(_id).answers = count));

  return [...rows.values()].sort((a, b) => b.farmers + b.buyers - (a.farmers + a.buyers) || a.county.localeCompare(b.county));
}

/** Current asking prices for active listings, grouped by category and unit, with a county breakdown. */
async function pricesFor(scope) {
  const listings = await Product.find({ ...scope.products, ...notRemoved }).select("category unit price county").lean();
  const groups = new Map();

  listings.forEach((listing) => {
    const unit = String(listing.unit || "unit").toLowerCase();
    const key = `${listing.category}|${unit}`;
    if (!groups.has(key)) groups.set(key, { category: listing.category, unit, prices: [], byCounty: new Map() });
    const group = groups.get(key);
    group.prices.push(listing.price);
    const county = listing.county ?? "Unknown";
    group.byCounty.set(county, [...(group.byCounty.get(county) ?? []), listing.price]);
  });

  return [...groups.values()]
    .map((group) => ({
      category: group.category,
      unit: group.unit,
      listings: group.prices.length,
      median: median(group.prices),
      min: Math.min(...group.prices),
      max: Math.max(...group.prices),
      byCounty: [...group.byCounty.entries()]
        .map(([county, prices]) => ({ county, listings: prices.length, median: median(prices) }))
        .sort((a, b) => b.median - a.median),
    }))
    .sort((a, b) => b.listings - a.listings);
}

async function topicsFor(scope, from, to) {
  const rows = await CommunityThread.aggregate([
    { $match: { ...scope.authored, ...inRange(from, to), ...notRemoved } },
    {
      $group: {
        _id: { $toLower: "$category" },
        label: { $first: "$category" },
        questions: { $sum: 1 },
        unanswered: { $sum: { $cond: [{ $eq: ["$repliesCount", 0] }, 1, 0] } },
        views: { $sum: "$viewsCount" },
      },
    },
    { $sort: { questions: -1 } },
  ]);

  return rows.map(({ label, questions, unanswered, views }) => ({
    topic: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
    questions,
    unanswered,
    views,
  }));
}

async function demandFor(scope, from, to) {
  return Order.aggregate([
    { $match: { ...scope.orders, ...inRange(from, to), status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
    {
      $group: {
        _id: { $ifNull: [{ $first: "$product.category" }, "Other"] },
        orders: { $sum: 1 },
        value: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
      },
    },
    { $project: { _id: 0, category: "$_id", orders: 1, value: 1 } },
    { $sort: { value: -1 } },
  ]);
}

export const getAnalytics = asyncHandler(async (req, res) => {
    const range = parseRange(req.query);
    const county = parseCounty(req.query);
    const scope = await countyScope(county);

    const [current, previous, series, regions, prices, topics, demand, unanswered, unmapped] = await Promise.all([
      kpisFor(scope, range.from, range.to),
      kpisFor(scope, range.previousFrom, range.from),
      seriesForRange(scope, range.from, range.to, range.unit),
      regionsFor(range.from, range.to),
      pricesFor(scope),
      topicsFor(scope, range.from, range.to),
      demandFor(scope, range.from, range.to),
      CommunityThread.find({ ...scope.authored, ...notRemoved, repliesCount: 0 })
        .populate("author", "name county")
        .sort({ createdAt: 1 })
        .limit(6)
        .select("title category createdAt author")
        .lean(),
      Promise.all([
        User.countDocuments({ county: null, accountStatus: "active" }),
        Product.countDocuments({ county: null, ...notRemoved }),
      ]),
    ]);

    res.json({
      range: { days: range.days, from: range.from, to: range.to, unit: range.unit },
      county: county === undefined ? "all" : (county ?? "unknown"),
      counties: KENYA_COUNTIES,
      kpis: { current, previous },
      series,
      regions,
      prices,
      topics,
      demand,
      unanswered,
      dataQuality: { usersWithoutCounty: unmapped[0], listingsWithoutCounty: unmapped[1] },
    });
});

// --- Partner export ------------------------------------------------------------------

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const suppressCount = (count) => (count > 0 && count < SUPPRESSION_THRESHOLD ? `<${SUPPRESSION_THRESHOLD}` : count);

export const exportRegionalReport = asyncHandler(async (req, res) => {
    const range = parseRange(req.query);
    const [regions, prices] = await Promise.all([regionsFor(range.from, range.to), pricesFor(await countyScope(undefined))]);
    const fmt = (date) => date.toISOString().slice(0, 10);

    const lines = [
      `# FarmConnect regional summary, ${fmt(range.from)} to ${fmt(range.to)} (${range.days} days)`,
      `# Aggregated data. Counts below ${SUPPRESSION_THRESHOLD} are shown as "<${SUPPRESSION_THRESHOLD}" and values from fewer than ${SUPPRESSION_THRESHOLD} orders are withheld, so no individual can be identified.`,
      "",
      "Section,County,Farmers,Buyers,Verified sellers,Active listings,Sales,Sales value (KES),Purchases,Purchase value (KES),Questions asked,Unanswered,Answers given",
      ...regions.map((row) =>
        [
          "Regions",
          row.county,
          suppressCount(row.farmers),
          suppressCount(row.buyers),
          suppressCount(row.verified),
          suppressCount(row.listings),
          suppressCount(row.sales),
          row.sales >= SUPPRESSION_THRESHOLD ? row.salesValue : "",
          suppressCount(row.purchases),
          row.purchases >= SUPPRESSION_THRESHOLD ? row.purchaseValue : "",
          suppressCount(row.questions),
          suppressCount(row.unanswered),
          suppressCount(row.answers),
        ]
          .map(csvCell)
          .join(",")
      ),
      "",
      "Section,Category,Unit,County,Listings,Median asking price (KES)",
      ...prices.flatMap((group) =>
        [{ county: "All counties", listings: group.listings, median: group.median }, ...group.byCounty]
          .filter((entry) => entry.listings >= MIN_LISTINGS_FOR_PRICE)
          .map((entry) => ["Prices", group.category, group.unit, entry.county, entry.listings, entry.median].map(csvCell).join(","))
      ),
    ];

    await AdminAction.create({
      admin: req.user._id,
      action: "analytics.export",
      targetType: "analytics",
      target: req.user._id,
      summary: `Regional summary CSV, last ${range.days} days`,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="farmconnect-regions-${fmt(range.to)}.csv"`);
    res.send(lines.join("\n"));
});
