import { Order } from "../../models/order.model.js";
import { notRemoved } from "../../models/moderation-fields.js";
import { Product } from "../../models/product.model.js";
import { Report } from "../../models/report.model.js";
import { User } from "../../models/user.model.js";
import { deleteUserAccount } from "../../services/accounts.js";
import { logAction, removeAllContentBy, setUserStatus } from "../../services/moderation.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createNotification } from "../../utils/notifications.js";
import { assertObjectId, escapeRegex, paginationMeta, parsePagination } from "../../utils/request.js";
import { recalculateTrustScoreForUser } from "../../utils/trust-score.js";


export const listUsers = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req, 25);
  const { search = "", role = "all", verification = "all", status = "all" } = req.query;
  const filters = { accountStatus: { $ne: "deleted" } };

  if (search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    filters.$or = [{ name: pattern }, { email: pattern }, { location: pattern }, { phone: pattern }];
  }
  if (["farmer", "buyer", "hobbyist"].includes(role)) filters.role = role;
  if (["unverified", "verified", "top-rated"].includes(verification)) filters.verificationStatus = verification;
  // The verification queue: active farmers who aren't verified yet.
  if (verification === "queue") {
    filters.role = "farmer";
    filters.verificationStatus = "unverified";
    filters.accountStatus = "active";
  }
  if (["active", "suspended"].includes(status)) filters.accountStatus = status;
  // Signed up with an email but never entered the confirmation code: where scripted sign-ups pile up.
  if (status === "unconfirmed") {
    filters.emailVerified = false;
    filters.isAdmin = { $ne: true };
  }

  const [users, total] = await Promise.all([
    User.find(filters)
      .select("name email role location phone avatarUrl bio verificationStatus trustScore accountStatus suspendedReason isAdmin emailVerified createdAt followers")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    User.countDocuments(filters),
  ]);

  const userIds = users.map((user) => user._id);
  const [listingCounts, orderCounts, reportCounts] = await Promise.all([
    Product.aggregate([{ $match: { seller: { $in: userIds }, ...notRemoved } }, { $group: { _id: "$seller", count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { seller: { $in: userIds }, status: "delivered" } }, { $group: { _id: "$seller", count: { $sum: 1 } } }]),
    Report.aggregate([{ $match: { targetType: "user", target: { $in: userIds }, status: "pending" } }, { $group: { _id: "$target", count: { $sum: 1 } } }]),
  ]);
  const countMap = (rows) => new Map(rows.map((row) => [String(row._id), row.count]));
  const listings = countMap(listingCounts);
  const sales = countMap(orderCounts);
  const reports = countMap(reportCounts);

  const items = users.map(({ followers, ...user }) => ({
    ...user,
    followersCount: followers?.length ?? 0,
    listingsCount: listings.get(String(user._id)) ?? 0,
    completedSales: sales.get(String(user._id)) ?? 0,
    pendingReports: reports.get(String(user._id)) ?? 0,
  }));

  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});

export const setVerification = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Top-rated is earned automatically from delivered sales and reviews (see utils/trust-score.js).
  if (!["unverified", "verified"].includes(status)) {
    throw new AppError("Status must be unverified or verified.", 400);
  }

  assertObjectId(req.params.userId, "user id");
  const user = await User.findById(req.params.userId);

  if (!user || user.accountStatus === "deleted") {
    throw new AppError("User not found.", 404);
  }

  const previous = user.verificationStatus;
  // Keep an earned top-rated badge when re-confirming verification.
  user.verificationStatus = status === "verified" && previous === "top-rated" ? "top-rated" : status;
  await user.save();
  const updated = await recalculateTrustScoreForUser(user._id);

  if (previous === "unverified" && status !== "unverified") {
    await createNotification({
      userId: user._id,
      type: "system",
      title: "You're verified",
      body: "Your FarmConnect account is now verified. Buyers can see your badge and your phone number on your listings.",
    });
  }

  await logAction(req, {
    action: "user.verification",
    targetType: "user",
    target: user._id,
    summary: `${user.name}: ${previous} → ${updated?.verificationStatus ?? status}`,
  });

  res.json({ message: "Verification updated.", item: updated ?? user });
});

export const setStatus = asyncHandler(async (req, res) => {
  const { status, reason = "", removeContent = false } = req.body;
  const user = await setUserStatus(req, req.params.userId, status, String(reason).trim());

  // Spam clean-up: optionally take down everything they posted along with the suspension.
  const removed = status === "suspended" && removeContent ? await removeAllContentBy(req, user, String(reason).trim()) : null;

  res.json({
    message:
      status === "suspended"
        ? removed
          ? `Account suspended. Removed ${removed.posts + removed.discussions + removed.comments + removed.answers} items they posted.`
          : "Account suspended."
        : "Account reinstated.",
    item: user,
    removed,
  });
});

const MAX_BULK_DELETE = 100;

/** Delete many accounts at once (bot clean-up). Admins and your own account are always skipped. */
export const bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { userIds, reason = "" } = req.body ?? {};

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError("Choose at least one account to delete.", 400);
  }

  if (userIds.length > MAX_BULK_DELETE) {
    throw new AppError(`You can delete up to ${MAX_BULK_DELETE} accounts at a time.`, 400);
  }

  userIds.forEach((id) => assertObjectId(id, "user id"));

  const users = await User.find({ _id: { $in: userIds }, accountStatus: { $ne: "deleted" } });
  const deletable = users.filter((user) => !user.isAdmin && String(user._id) !== String(req.user._id));
  const trimmedReason = String(reason).trim();

  // One at a time keeps the follower/following clean-up from racing between accounts.
  for (const user of deletable) {
    const summary = `${user.name} (${user.email || user.phone || user._id})`;
    await deleteUserAccount(user);
    await logAction(req, { action: "user.delete", targetType: "user", target: user._id, summary, reason: trimmedReason });
  }

  const skipped = userIds.length - deletable.length;

  res.json({
    message: `Deleted ${deletable.length} account${deletable.length === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} (admins, your own account, or already deleted).` : ""}`,
    deleted: deletable.length,
    skipped,
  });
});
