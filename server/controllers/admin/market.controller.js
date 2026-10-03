import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { Report } from "../../models/report.model.js";
import { User } from "../../models/user.model.js";
import { USER_FIELDS, logAction, moderationFilter } from "../../services/moderation.js";
import { notRemoved } from "../../models/moderation-fields.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createNotification } from "../../utils/notifications.js";
import { restockOrder } from "../../utils/orders.js";
import { assertObjectId, escapeRegex, paginationMeta, parsePagination } from "../../utils/request.js";

const STALE_PENDING_MS = 3 * 24 * 60 * 60 * 1000;
const STALE_ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

/** Orders that look stuck: pending for 3+ days, or accepted/in transit with no update for a week. */
export function stuckOrderFilter() {
  const now = Date.now();
  return {
    $or: [
      { status: "pending", createdAt: { $lt: new Date(now - STALE_PENDING_MS) } },
      { status: { $in: ["accepted", "in-transit"] }, updatedAt: { $lt: new Date(now - STALE_ACTIVE_MS) } },
    ],
  };
}


export const listProducts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const { search = "", category = "all", county = "all", status = "all", sort = "newest" } = req.query;
  const filters = status === "featured" ? { featured: true, ...notRemoved } : moderationFilter(status);

  if (search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    const sellers = await User.find({ name: pattern }).select("_id").lean();
    filters.$or = [{ name: pattern }, { description: pattern }, { location: pattern }, { seller: { $in: sellers.map((user) => user._id) } }];
  }
  if (category !== "all") filters.category = category;
  if (county !== "all") filters.county = county === "unknown" ? null : county;

  const sortBy =
    sort === "price-high" ? { price: -1 } : sort === "price-low" ? { price: 1 } : sort === "low-stock" ? { stock: 1 } : { createdAt: -1 };

  const [products, total, categories] = await Promise.all([
    Product.find(filters)
      .populate("seller", `${USER_FIELDS} accountStatus`)
      .sort(sortBy)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Product.countDocuments(filters),
    Product.distinct("category"),
  ]);

  const productIds = products.map((product) => product._id);
  const [orderCounts, reportCounts] = await Promise.all([
    Order.aggregate([
      { $match: { "items.product": { $in: productIds } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]),
    Report.aggregate([
      { $match: { targetType: "product", target: { $in: productIds }, status: "pending" } },
      { $group: { _id: "$target", count: { $sum: 1 } } },
    ]),
  ]);
  const ordersById = new Map(orderCounts.map((row) => [String(row._id), row]));
  const reportsById = new Map(reportCounts.map((row) => [String(row._id), row.count]));

  const items = products.map((product) => ({
    ...product,
    orderStats: ordersById.get(String(product._id)) ?? { orders: 0, delivered: 0, cancelled: 0 },
    pendingReports: reportsById.get(String(product._id)) ?? 0,
  }));

  res.json({ items, categories: categories.sort(), pagination: paginationMeta(pagination, items.length, total) });
});

export const featureProduct = asyncHandler(async (req, res) => {
  assertObjectId(req.params.productId, "listing id");
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new AppError("Listing not found.", 404);
  }

  product.featured = Boolean(req.body.featured);
  await product.save();
  await logAction(req, {
    action: product.featured ? "product.feature" : "product.unfeature",
    targetType: "product",
    target: product._id,
    summary: product.name,
  });

  res.json({ message: product.featured ? "Listing featured." : "Listing no longer featured.", item: product });
});

export const listOrders = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const { status = "all", search = "" } = req.query;
  const conditions = [];

  if (["pending", "accepted", "in-transit", "delivered", "cancelled"].includes(status)) conditions.push({ status });
  if (status === "stuck") conditions.push(stuckOrderFilter());
  if (search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    const people = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select("_id").lean();
    const ids = people.map((person) => person._id);
    conditions.push({ $or: [{ buyer: { $in: ids } }, { seller: { $in: ids } }, { "items.name": pattern }] });
  }
  const filters = conditions.length ? { $and: conditions } : {};

  const [items, total, statusCounts, stuck] = await Promise.all([
    Order.find(filters)
      .populate("buyer", `${USER_FIELDS} phone`)
      .populate("seller", `${USER_FIELDS} phone`)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Order.countDocuments(filters),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$totalAmount" } } }]),
    Order.countDocuments(stuckOrderFilter()),
  ]);

  res.json({
    items,
    summary: { byStatus: Object.fromEntries(statusCounts.map((row) => [row._id, { count: row.count, value: row.value }])), stuck },
    pagination: paginationMeta(pagination, items.length, total),
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason ?? "").trim();
  assertObjectId(req.params.orderId, "order id");
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  if (["delivered", "cancelled"].includes(order.status)) {
    throw new AppError("This order is already closed.", 400);
  }

  if (!reason) {
    throw new AppError("A reason is required; both people on the order will see it.", 400);
  }

  order.status = "cancelled";
  order.etaLabel = "Cancelled by FarmConnect";
  await order.save();
  await restockOrder(order);

  const label = `Order ${String(order._id).slice(-6).toUpperCase()}`;
  await Promise.all(
    [order.buyer, order.seller].map((userId) =>
      createNotification({ userId, type: "order", title: `${label} was cancelled`, body: `FarmConnect cancelled this order: ${reason}` })
    )
  );
  await logAction(req, {
    action: "order.cancel",
    targetType: "order",
    target: order._id,
    summary: `${label} · ${order.items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(", ")}`,
    reason,
  });

  res.json({ message: "Order cancelled.", item: order });
});
