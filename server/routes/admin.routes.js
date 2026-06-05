import { Router } from "express";

import { seedDatabase } from "../data/seed.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const adminRouter = Router();

function requireSecret({ envKey, header, label }) {
  return function secretMiddleware(req, _res, next) {
    const expectedSecret = envKey === "ADMIN_SECRET" ? env.adminSecret : process.env[envKey];
    const providedSecret = req.header(header) || req.body?.secret;

    if (!expectedSecret) {
      next(new AppError(`${label} is not configured.`, 503));
      return;
    }

    if (providedSecret !== expectedSecret) {
      next(new AppError(`Invalid ${label}.`, 403));
      return;
    }

    next();
  };
}

function requireSeedOrAdminSecret(req, _res, next) {
  const providedSeedSecret = req.header("x-seed-secret") || req.body?.seedSecret || req.body?.secret;
  const providedAdminSecret = req.header("x-admin-secret") || req.body?.adminSecret;

  if (process.env.SEED_SECRET && providedSeedSecret === process.env.SEED_SECRET) {
    next();
    return;
  }

  if (env.adminSecret && providedAdminSecret === env.adminSecret) {
    next();
    return;
  }

  if (!process.env.SEED_SECRET && !env.adminSecret) {
    next(new AppError("SEED_SECRET or ADMIN_SECRET is not configured.", 503));
    return;
  }

  next(new AppError("Invalid seed/admin secret.", 403));
}

const requireAdminSecret = requireSecret({
  envKey: "ADMIN_SECRET",
  header: "x-admin-secret",
  label: "ADMIN_SECRET",
});

function parsePagination(req, defaultLimit = 20) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || defaultLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

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

adminRouter.post(
  "/seed",
  requireSeedOrAdminSecret,
  asyncHandler(async (req, res) => {
    const reset = req.query.reset === "true" || req.body?.reset === true;
    const summary = await seedDatabase({ reset });

    res.json({
      message: `FarmConnect database ${reset ? "reset and seeded" : "seeded"} successfully.`,
      summary,
    });
  })
);

adminRouter.get(
  "/overview",
  requireAdminSecret,
  asyncHandler(async (_req, res) => {
    const [
      totalUsers,
      totalPosts,
      activePosts,
      pinnedPosts,
      removedPosts,
      totalThreads,
      pinnedThreads,
      removedThreads,
      totalListings,
      totalOrders,
      pendingReports,
      recentReports,
      topPosts,
      topThreads,
    ] = await Promise.all([
      User.countDocuments({ accountStatus: { $ne: "deleted" } }),
      Post.countDocuments(),
      Post.countDocuments({ moderationStatus: { $ne: "removed" } }),
      Post.countDocuments({ isPinned: true, moderationStatus: { $ne: "removed" } }),
      Post.countDocuments({ moderationStatus: "removed" }),
      CommunityThread.countDocuments(),
      CommunityThread.countDocuments({ isPinned: true, moderationStatus: { $ne: "removed" } }),
      CommunityThread.countDocuments({ moderationStatus: "removed" }),
      Product.countDocuments(),
      Order.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.find().sort({ createdAt: -1 }).limit(5).populate("reporter", "name email role").lean(),
      Post.find({ moderationStatus: { $ne: "removed" } })
        .populate("author", "name role location avatarUrl")
        .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      CommunityThread.find({ moderationStatus: { $ne: "removed" } })
        .populate("author", "name role location avatarUrl")
        .sort({ repliesCount: -1, viewsCount: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        activePosts,
        pinnedPosts,
        removedPosts,
        totalThreads,
        pinnedThreads,
        removedThreads,
        totalListings,
        totalOrders,
        pendingReports,
      },
      recentReports,
      topPosts,
      topThreads,
    });
  })
);

adminRouter.get(
  "/feed",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req);
    const status = req.query.status || "all";
    const filters = {};

    if (status === "active") filters.moderationStatus = { $ne: "removed" };
    if (status === "removed") filters.moderationStatus = "removed";
    if (status === "pinned") {
      filters.isPinned = true;
      filters.moderationStatus = { $ne: "removed" };
    }

    const [items, total] = await Promise.all([
      Post.find(filters)
        .populate("author", "name email role location avatarUrl verificationStatus")
        .sort(postSort(req.query.sort))
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filters),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, hasMore: skip + items.length < total },
    });
  })
);

adminRouter.patch(
  "/feed/:postId/pin",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      throw new AppError("Post not found.", 404);
    }

    post.isPinned = Boolean(req.body.isPinned);
    post.pinnedUntil = req.body.pinnedUntil ? new Date(req.body.pinnedUntil) : null;
    await post.save();

    res.json({ message: post.isPinned ? "Post pinned." : "Post unpinned.", item: post });
  })
);

adminRouter.patch(
  "/feed/:postId/moderation",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { status, reason = "" } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      throw new AppError("Post not found.", 404);
    }

    if (!["active", "removed"].includes(status)) {
      throw new AppError("Status must be active or removed.", 400);
    }

    post.moderationStatus = status;
    post.removedReason = status === "removed" ? reason : "";
    post.removedAt = status === "removed" ? new Date() : null;
    if (status === "removed") {
      post.isPinned = false;
      post.pinnedUntil = null;
    }
    await post.save();

    await Report.updateMany(
      { targetType: "post", target: post._id, status: "pending" },
      { status: status === "removed" ? "actioned" : "reviewed", reviewedAt: new Date() }
    );

    res.json({ message: status === "removed" ? "Post taken down." : "Post restored.", item: post });
  })
);

adminRouter.get(
  "/threads",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req);
    const status = req.query.status || "all";
    const filters = {};

    if (status === "active") filters.moderationStatus = { $ne: "removed" };
    if (status === "removed") filters.moderationStatus = "removed";
    if (status === "pinned") {
      filters.isPinned = true;
      filters.moderationStatus = { $ne: "removed" };
    }

    const [items, total] = await Promise.all([
      CommunityThread.find(filters)
        .populate("author", "name email role location avatarUrl verificationStatus")
        .sort(threadSort(req.query.sort))
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityThread.countDocuments(filters),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, hasMore: skip + items.length < total },
    });
  })
);

adminRouter.patch(
  "/threads/:threadId/pin",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const thread = await CommunityThread.findById(req.params.threadId);

    if (!thread) {
      throw new AppError("Thread not found.", 404);
    }

    thread.isPinned = Boolean(req.body.isPinned);
    await thread.save();

    res.json({ message: thread.isPinned ? "Thread pinned." : "Thread unpinned.", item: thread });
  })
);

adminRouter.patch(
  "/threads/:threadId/moderation",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { status, reason = "" } = req.body;
    const thread = await CommunityThread.findById(req.params.threadId);

    if (!thread) {
      throw new AppError("Thread not found.", 404);
    }

    if (!["active", "removed"].includes(status)) {
      throw new AppError("Status must be active or removed.", 400);
    }

    thread.moderationStatus = status;
    thread.removedReason = status === "removed" ? reason : "";
    thread.removedAt = status === "removed" ? new Date() : null;
    if (status === "removed") {
      thread.isPinned = false;
    }
    await thread.save();

    await Report.updateMany(
      { targetType: "thread", target: thread._id, status: "pending" },
      { status: status === "removed" ? "actioned" : "reviewed", reviewedAt: new Date() }
    );

    res.json({ message: status === "removed" ? "Thread taken down." : "Thread restored.", item: thread });
  })
);

adminRouter.get(
  "/reports",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req);
    const status = req.query.status || "pending";
    const filters = status === "all" ? {} : { status };

    const [items, total] = await Promise.all([
      Report.find(filters)
        .populate("reporter", "name email role location avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filters),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, hasMore: skip + items.length < total },
    });
  })
);

adminRouter.patch(
  "/reports/:reportId",
  requireAdminSecret,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!["pending", "reviewed", "dismissed", "actioned"].includes(status)) {
      throw new AppError("Invalid report status.", 400);
    }

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { status, reviewedAt: status === "pending" ? null : new Date() },
      { new: true }
    ).populate("reporter", "name email role location avatarUrl");

    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    res.json({ message: "Report updated.", item: report });
  })
);

export default adminRouter;
