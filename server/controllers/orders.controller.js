import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createNotification } from "../utils/notifications.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

async function findOrderForUser(orderId, userId) {
  return Order.findOne({
    _id: orderId,
    $or: [{ buyer: userId }, { seller: userId }],
  })
    .populate("buyer", "name role location avatarUrl phone verificationStatus trustScore")
    .populate("seller", "name role location avatarUrl phone verificationStatus trustScore")
    .populate("items.product", "name category");
}

export const getOrders = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.scope === "seller") {
    filters.seller = req.user._id;
  } else {
    filters.buyer = req.user._id;
  }

  const orders = await Order.find(filters)
    .populate("buyer", "name role location avatarUrl")
    .populate("seller", "name role location avatarUrl")
    .populate("items.product", "name category")
    .sort({ createdAt: -1 });

  res.json({ items: orders });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOrderForUser(req.params.orderId, req.user._id);

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  const remark = await SellerRemark.findOne({ order: order._id })
    .populate("buyer", "name role location avatarUrl verificationStatus trustScore")
    .populate("seller", "name role location avatarUrl verificationStatus trustScore");

  res.json({
    item: order,
    remark,
  });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, note = "", deliveryLocation = "", deliveryContact = "" } = req.body;

  if (!productId) {
    throw new AppError("A productId is required to create an order.", 400);
  }

  const product = await Product.findById(productId).populate("seller");

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  if (String(product.seller._id) === String(req.user._id)) {
    throw new AppError("You cannot order your own listing.", 400);
  }

  if (Number(quantity) < 1) {
    throw new AppError("Quantity must be at least 1.", 400);
  }

  if (quantity > product.stock) {
    throw new AppError("Requested quantity is higher than available stock.", 400);
  }

  const totalAmount = product.price * quantity;
  product.stock -= quantity;
  await product.save();

  const order = await Order.create({
    buyer: req.user._id,
    seller: product.seller._id,
    items: [
      {
        product: product._id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        unit: product.unit,
      },
    ],
    totalAmount,
    status: "pending",
    etaLabel: "Confirming delivery window",
    note,
    deliveryLocation: String(deliveryLocation || req.user.location || "").trim(),
    deliveryContact: String(deliveryContact || req.user.phone || "").trim(),
  });

  const populatedOrder = await Order.findById(order._id)
    .populate("buyer", "name role location avatarUrl")
    .populate("seller", "name role location avatarUrl")
    .populate("items.product", "name category");

  if (String(product.seller._id) !== String(req.user._id)) {
    await createNotification({
      userId: product.seller._id,
      title: "New marketplace request",
      body: `${req.user.name} requested ${product.name}. Confirm stock, contact details, and direct payment outside FarmConnect.`,
      type: "order",
    });

    await createNotification({
      userId: req.user._id,
      title: "Order request sent",
      body: `Your request for ${product.name} is pending seller confirmation. Use the verified seller contact to coordinate payment directly.`,
      type: "order",
    });
  }

  await Promise.all([
    recalculateTrustScoreForUser(req.user._id),
    recalculateTrustScoreForUser(product.seller._id),
  ]);

  res.status(201).json({
    message: "Order request created. Coordinate payment directly with the verified seller contact.",
    item: populatedOrder,
  });
});

export const completeOrderWithRemark = asyncHandler(async (req, res) => {
  const { rating, body } = req.body;
  const parsedRating = Number(rating);

  if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new AppError("Rating must be between 1 and 5.", 400);
  }

  if (!String(body || "").trim()) {
    throw new AppError("A short remark is required.", 400);
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    buyer: req.user._id,
  });

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  if (order.status === "cancelled") {
    throw new AppError("Cancelled orders cannot be completed.", 400);
  }

  const remark = await SellerRemark.findOneAndUpdate(
    { order: order._id },
    {
      order: order._id,
      buyer: req.user._id,
      seller: order.seller,
      rating: Math.round(parsedRating),
      body: String(body).trim(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .populate("buyer", "name role location avatarUrl verificationStatus trustScore")
    .populate("seller", "name role location avatarUrl verificationStatus trustScore");

  order.status = "delivered";
  order.etaLabel = "Completed";
  await order.save();

  await Promise.all([
    createNotification({
      userId: order.seller,
      title: "Buyer remark received",
      body: `${req.user.name} completed an order and left a remark.`,
      type: "order",
    }),
    recalculateTrustScoreForUser(order.seller),
    recalculateTrustScoreForUser(req.user._id),
  ]);

  const populatedOrder = await Order.findById(order._id)
    .populate("buyer", "name role location avatarUrl")
    .populate("seller", "name role location avatarUrl")
    .populate("items.product", "name category");

  res.json({
    message: "Order completed and seller remark saved.",
    item: populatedOrder,
    remark,
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["accepted", "in-transit", "cancelled"];

  if (!allowedStatuses.includes(status)) {
    throw new AppError("Unsupported order status.", 400);
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  });

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  const isBuyer = String(order.buyer) === String(req.user._id);
  const isSeller = String(order.seller) === String(req.user._id);

  if (order.status === "delivered" || order.status === "cancelled") {
    throw new AppError("This order is already closed.", 400);
  }

  if (status === "accepted" && (!isSeller || order.status !== "pending")) {
    throw new AppError("Only the seller can accept a pending order.", 403);
  }

  if (status === "in-transit" && (!isSeller || order.status !== "accepted")) {
    throw new AppError("Only the seller can dispatch an accepted order.", 403);
  }

  if (status === "cancelled" && !((isBuyer && order.status === "pending") || isSeller)) {
    throw new AppError("This order cannot be cancelled by your account.", 403);
  }

  order.status = status;
  order.etaLabel =
    status === "accepted"
      ? "Seller accepted"
      : status === "in-transit"
        ? "On the way"
        : "Cancelled";
  await order.save();

  const notifyUserId = isSeller ? order.buyer : order.seller;
  await createNotification({
    userId: notifyUserId,
    title: "Order status updated",
    body: `Order ${String(order._id).slice(-6)} is now ${status.replace("-", " ")}.`,
    type: "order",
  });

  const populatedOrder = await findOrderForUser(order._id, req.user._id);
  const remark = await SellerRemark.findOne({ order: order._id })
    .populate("buyer", "name role location avatarUrl verificationStatus trustScore")
    .populate("seller", "name role location avatarUrl verificationStatus trustScore");

  res.json({
    message: "Order status updated.",
    item: populatedOrder,
    remark,
  });
});
