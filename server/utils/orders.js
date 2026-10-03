import { Product } from "../models/product.model.js";

/** Return a cancelled order's quantities to stock (stock is reserved when the order is placed). */
export async function restockOrder(order) {
  await Promise.all(
    order.items
      .filter((item) => item.product)
      .map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
  );
}
