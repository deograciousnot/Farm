import { Payment } from "../../models/payment.model.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginationMeta, parsePagination } from "../../utils/request.js";

const DAY = 86_400_000;

/** Revenue from real M-Pesa payments in a window. Simulated (test) payments never count. */
async function revenueBetween(from, to) {
  const [row] = await Payment.aggregate([
    { $match: { status: "paid", simulated: false, paidAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        boosts: { $sum: { $cond: [{ $eq: ["$purpose", "listing-boost"] }, "$amount", 0] } },
        sponsored: { $sum: { $cond: [{ $eq: ["$purpose", "sponsored-credits"] }, "$amount", 0] } },
        customers: { $addToSet: "$user" },
      },
    },
  ]);

  return {
    total: row?.total ?? 0,
    count: row?.count ?? 0,
    boosts: row?.boosts ?? 0,
    sponsored: row?.sponsored ?? 0,
    customers: row?.customers.length ?? 0,
  };
}

export const getRevenue = asyncHandler(async (req, res) => {
  const now = new Date();
  const pagination = parsePagination(req, 30);
  const filters = ["pending", "paid", "failed", "cancelled"].includes(req.query.status) ? { status: req.query.status } : {};

  const [last30, previous30, allTime, items, total] = await Promise.all([
    revenueBetween(new Date(now - 30 * DAY), now),
    revenueBetween(new Date(now - 60 * DAY), new Date(now - 30 * DAY)),
    revenueBetween(new Date(0), now),
    Payment.find(filters)
      .populate("user", "name email phone")
      .populate("product", "name")
      .populate("organization", "name")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Payment.countDocuments(filters),
  ]);

  res.json({ summary: { last30, previous30, allTime }, items, pagination: paginationMeta(pagination, items.length, total) });
});
