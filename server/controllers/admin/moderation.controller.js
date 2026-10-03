import { AdminAction } from "../../models/admin-action.model.js";
import { CommunityThread } from "../../models/community-thread.model.js";
import { notRemoved } from "../../models/moderation-fields.js";
import { Notification } from "../../models/notification.model.js";
import { Order } from "../../models/order.model.js";
import { Post } from "../../models/post.model.js";
import { Product } from "../../models/product.model.js";
import { Report } from "../../models/report.model.js";
import { User } from "../../models/user.model.js";
import {
  USER_FIELDS,
  attachReportTargets,
  logAction,
  moderationFilter,
  setContentStatus,
  setUserStatus,
} from "../../services/moderation.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { assertObjectId, escapeRegex, paginationMeta, parsePagination } from "../../utils/request.js";
import { stuckOrderFilter } from "./market.controller.js";

function postSort(sort = "newest") {
  if (sort === "top-liked") return { likesCount: -1, createdAt: -1 };
  if (sort === "top-saved") return { savesCount: -1, createdAt: -1 };
  if (sort === "most-commented") return { commentsCount: -1, createdAt: -1 };
  if (sort === "pinned") return { isPinned: -1, createdAt: -1 };
  return { createdAt: -1 };
}

function threadSort(sort = "top") {
  if (sort === "newest") return { createdAt: -1 };
  if (sort === "pinned") return { isPinned: -1, createdAt: -1 };
  return { repliesCount: -1, viewsCount: -1, createdAt: -1 };
}


export const getOverview = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    suspendedUsers,
    pendingVerifications,
    totalPosts,
    activePosts,
    pinnedPosts,
    removedPosts,
    totalThreads,
    removedThreads,
    totalListings,
    totalOrders,
    pendingReports,
    stuckOrders,
    topPosts,
    topThreads,
    recentActions,
  ] = await Promise.all([
    User.countDocuments({ accountStatus: { $ne: "deleted" } }),
    User.countDocuments({ accountStatus: "suspended" }),
    User.countDocuments({ role: "farmer", verificationStatus: "unverified", accountStatus: "active" }),
    Post.countDocuments(),
    Post.countDocuments(notRemoved),
    Post.countDocuments({ isPinned: true, ...notRemoved }),
    Post.countDocuments({ moderationStatus: "removed" }),
    CommunityThread.countDocuments(notRemoved),
    CommunityThread.countDocuments({ moderationStatus: "removed" }),
    Product.countDocuments(notRemoved),
    Order.countDocuments(),
    Report.countDocuments({ status: "pending" }),
    Order.countDocuments(stuckOrderFilter()),
    Post.find(notRemoved).populate("author", USER_FIELDS).sort({ likesCount: -1, commentsCount: -1 }).limit(5).lean(),
    CommunityThread.find(notRemoved).populate("author", USER_FIELDS).sort({ repliesCount: -1, viewsCount: -1 }).limit(5).lean(),
    AdminAction.find().populate("admin", "name").sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  res.json({
    stats: {
      totalUsers,
      suspendedUsers,
      pendingVerifications,
      totalPosts,
      activePosts,
      pinnedPosts,
      removedPosts,
      totalThreads,
      removedThreads,
      totalListings,
      totalOrders,
      pendingReports,
      stuckOrders,
    },
    topPosts,
    topThreads,
    recentActions,
  });
});

export const listReports = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const status = req.query.status || "pending";
  const filters = status === "all" ? {} : { status };

  const [items, total] = await Promise.all([
    Report.find(filters)
      .populate("reporter", USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Report.countDocuments(filters),
  ]);

  res.json({ items: await attachReportTargets(items), pagination: paginationMeta(pagination, items.length, total) });
});

export const updateReport = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["pending", "reviewed", "dismissed"].includes(status)) {
    throw new AppError("Use the action endpoint to remove reported content.", 400);
  }

  assertObjectId(req.params.reportId, "report id");
  const report = await Report.findByIdAndUpdate(
    req.params.reportId,
    { status, reviewedAt: status === "pending" ? null : new Date() },
    { new: true }
  );

  if (!report) {
    throw new AppError("Report not found.", 404);
  }

  await logAction(req, { action: `report.${status}`, targetType: "report", target: report._id, summary: report.reason });
  res.json({ message: "Report updated.", item: report });
});

export const actOnReport = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason ?? "").trim();
  assertObjectId(req.params.reportId, "report id");
  const report = await Report.findById(req.params.reportId);

  if (!report) {
    throw new AppError("Report not found.", 404);
  }

  if (report.targetType === "user") {
    await setUserStatus(req, report.target, "suspended", reason);
  } else {
    await setContentStatus(req, report.targetType, report.target, "removed", reason);
  }

  // setContent/UserStatus closes every pending report on the same target; make sure this one is too.
  report.status = "actioned";
  report.reviewedAt = new Date();
  await report.save();

  res.json({ message: report.targetType === "user" ? "Account suspended." : "Content removed.", item: report });
});

export const moderateContent = asyncHandler(async (req, res) => {
  const { status, reason = "" } = req.body;
  const item = await setContentStatus(req, req.params.targetType, req.params.id, status, String(reason).trim());
  res.json({ message: status === "removed" ? "Removed." : "Restored.", item });
});

export const listFeedPosts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const filters = moderationFilter(req.query.status);

  const [items, total] = await Promise.all([
    Post.find(filters)
      .populate("author", USER_FIELDS)
      .sort(postSort(req.query.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Post.countDocuments(filters),
  ]);

  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});

export const pinPost = asyncHandler(async (req, res) => {
  assertObjectId(req.params.postId, "post id");
  const post = await Post.findById(req.params.postId);

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  post.isPinned = Boolean(req.body.isPinned);
  post.pinnedUntil = req.body.pinnedUntil ? new Date(req.body.pinnedUntil) : null;
  await post.save();
  await logAction(req, { action: post.isPinned ? "post.pin" : "post.unpin", targetType: "post", target: post._id, summary: post.headline });

  res.json({ message: post.isPinned ? "Post pinned." : "Post unpinned.", item: post });
});

export const listThreads = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const filters = moderationFilter(req.query.status);

  const [items, total] = await Promise.all([
    CommunityThread.find(filters)
      .populate("author", USER_FIELDS)
      .sort(threadSort(req.query.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    CommunityThread.countDocuments(filters),
  ]);

  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});

export const pinThread = asyncHandler(async (req, res) => {
  assertObjectId(req.params.threadId, "thread id");
  const thread = await CommunityThread.findById(req.params.threadId);

  if (!thread) {
    throw new AppError("Thread not found.", 404);
  }

  thread.isPinned = Boolean(req.body.isPinned);
  await thread.save();
  await logAction(req, { action: thread.isPinned ? "thread.pin" : "thread.unpin", targetType: "thread", target: thread._id, summary: thread.title });

  res.json({ message: thread.isPinned ? "Thread pinned." : "Thread unpinned.", item: thread });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req, 30);
  const type = req.query.type || "all";
  const filters = type === "all" ? {} : { type };

  const [items, total] = await Promise.all([
    Notification.find(filters)
      .populate("user", USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Notification.countDocuments(filters),
  ]);

  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  assertObjectId(req.params.notificationId, "notification id");
  const notification = await Notification.findByIdAndDelete(req.params.notificationId);

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  await logAction(req, { action: "notification.delete", targetType: "notification", target: notification._id, summary: notification.title });
  res.json({ message: "Notification removed.", item: notification });
});

export const listAuditLog = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req, 30);
  const filters = {};

  if (req.query.action && req.query.action !== "all") {
    filters.action = new RegExp(`^${escapeRegex(String(req.query.action))}`);
  }

  const [items, total] = await Promise.all([
    AdminAction.find(filters).populate("admin", "name email").sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    AdminAction.countDocuments(filters),
  ]);

  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});
