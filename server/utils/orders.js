import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { createNotification } from "./notifications.js";

/** A buyer can only hold this many unanswered requests at once, so nobody can tie up the market's stock. */
export const MAX_PENDING_ORDERS_PER_BUYER = 5;

/** Requests the seller hasn't accepted in this long are cancelled and their stock goes back on sale. */
export const PENDING_ORDER_TTL_MS = 3 * 86_400_000;

/** Return a cancelled order's quantities to stock (stock is reserved when the order is placed). */
export async function restockOrder(order) {
  await Promise.all(
    order.items
      .filter((item) => item.product)
      .map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
  );
}

/**
 * Cancels requests that sat unanswered for PENDING_ORDER_TTL_MS and puts their stock back. Runs on a timer
 * from server.js. Each order is cancelled with a conditional update, so a seller accepting at the same moment wins.
 */
export async function releaseStalePendingOrders() {
  const cutoff = new Date(Date.now() - PENDING_ORDER_TTL_MS);
  const stale = await Order.find({ status: "pending", createdAt: { $lt: cutoff } }).select("_id").limit(200).lean();
  let released = 0;

  for (const { _id } of stale) {
    const order = await Order.findOneAndUpdate(
      { _id, status: "pending" },
      { status: "cancelled", etaLabel: "Expired: the seller didn't respond in 3 days" },
      { returnDocument: "after" }
    );

    if (!order) continue;

    await restockOrder(order);
    released += 1;
    const ref = String(order._id).slice(-6);

    await Promise.all([
      createNotification({
        userId: order.buyer,
        title: "Order request expired",
        body: `The seller didn't respond to order ${ref} within 3 days, so it was cancelled. You can order from another seller.`,
        type: "order",
      }),
      createNotification({
        userId: order.seller,
        title: "Order request expired",
        body: `Order ${ref} was cancelled because it wasn't accepted within 3 days. The stock is back on your listing.`,
        type: "order",
      }),
    ]);
  }

  return released;
}
