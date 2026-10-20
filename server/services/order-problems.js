import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { assertObjectId } from "../utils/request.js";
import { createNotification } from "../utils/notifications.js";

/**
 * Buyers report an order that went wrong. FarmConnect never holds the money for goods, so it can't refund;
 * what it can do is stop a seller who takes payment and vanishes from finding more buyers.
 */

export const ORDER_PROBLEMS = {
  "not-delivered": "Paid but goods never arrived",
  "wrong-goods": "Goods were wrong, short, or poor quality",
  unresponsive: "Seller stopped responding",
  "asked-to-pay-elsewhere": "Seller asked for payment in a suspicious way",
  other: "Something else",
};

// Reports from this many different buyers in the window take a seller's listings down until FarmConnect reviews them.
export const AUTO_PAUSE_BUYERS = 2;
const WINDOW_MS = 30 * 86_400_000;
export const PAUSE_REASON = "Paused for review: buyers reported problems with orders from this seller.";

export async function reportOrderProblem(user, orderId, { problem, note = "" }) {
  assertObjectId(orderId, "order id");
  const label = ORDER_PROBLEMS[problem];

  if (!label) {
    throw new AppError("Choose what went wrong.", 400);
  }

  const order = await Order.findOne({ _id: orderId, buyer: user._id });

  if (!order) {
    throw new AppError("Only the buyer can report a problem with this order.", 404);
  }

  if (!order.seller) {
    throw new AppError("The seller's account no longer exists.", 400);
  }

  if (await Report.exists({ order: order._id, reporter: user._id })) {
    throw new AppError("You've already reported this order. FarmConnect is looking into it.", 409);
  }

  const details = String(note).trim().slice(0, 500);
  const report = await Report.create({
    // Filed against the seller, so the admin's existing "suspend" action applies directly.
    targetType: "user",
    target: order.seller,
    reporter: user._id,
    order: order._id,
    reason: `Order problem: ${label}`,
    note: [`Order ${order._id} · ${order.items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(", ")} · KES ${order.totalAmount} · status ${order.status}`, details]
      .filter(Boolean)
      .join("\n"),
  });

  const paused = await pauseSellerIfRepeated(order.seller);
  return { report, paused };
}

/** Takes a seller's listings down (reversibly) once several different buyers have open order reports against them. */
async function pauseSellerIfRepeated(sellerId) {
  const reporters = await Report.distinct("reporter", {
    targetType: "user",
    target: sellerId,
    order: { $ne: null },
    status: "pending",
    createdAt: { $gt: new Date(Date.now() - WINDOW_MS) },
  });

  if (reporters.length < AUTO_PAUSE_BUYERS) {
    return false;
  }

  const result = await Product.updateMany(
    { seller: sellerId, moderationStatus: { $ne: "removed" } },
    // Boosts end too: paid visibility must never keep pointing buyers at a seller under review.
    { moderationStatus: "removed", removedReason: PAUSE_REASON, removedAt: new Date(), featured: false, featuredUntil: null }
  );

  if (result.modifiedCount > 0) {
    await createNotification({
      userId: sellerId,
      title: "Your listings are paused",
      body: "Several buyers reported problems with their orders. FarmConnect will review and contact you. Reply to the buyers and settle any open orders.",
    });

    const admins = await User.find({ isAdmin: true }).select("_id").lean();
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          title: "Seller auto-paused",
          body: `${reporters.length} buyers reported order problems; ${result.modifiedCount} listings were taken down. Review in Reports.`,
        })
      )
    );
  }

  return true;
}
