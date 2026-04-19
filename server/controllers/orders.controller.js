import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createNotification } from "../utils/notifications.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

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
      title: "New marketplace order",
      body: `${req.user.name} placed an order for ${product.name}.`,
      type: "order",
    });

    await createNotification({
      userId: req.user._id,
      title: "Order placed",
      body: `Your request for ${product.name} is pending seller confirmation.`,
      type: "order",
    });
  }

  await Promise.all([
    recalculateTrustScoreForUser(req.user._id),
    recalculateTrustScoreForUser(product.seller._id),
  ]);

  res.status(201).json({
    message: "Order created successfully.",
    item: populatedOrder,
  });
});
