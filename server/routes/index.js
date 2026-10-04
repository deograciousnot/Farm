import { Router } from "express";

import {
  createReply,
  createThread,
  getCommunityOverview,
  getRepliesForThread,
  getThreadById,
} from "../controllers/community.controller.js";
import { createComment, getCommentsForPost, toggleLikedPost, toggleSavedPost } from "../controllers/comments.controller.js";
import { createFeedPost, deleteFeedPost, getFeed, getFeedPostById } from "../controllers/feed.controller.js";
import { dismissBroadcast, getBroadcast, listBroadcasts } from "../controllers/broadcasts.controller.js";
import { createReport } from "../controllers/reports.controller.js";
import { completeOrderWithRemark, createOrder, getOrderById, getOrders, updateOrderStatus } from "../controllers/orders.controller.js";
import {
  getPublicProfile,
  getMyProfile,
  markAllNotificationsRead,
  markNotificationRead,
  toggleFollowUser,
  updateMyProfile,
} from "../controllers/profile.controller.js";
import { attachUserIfPresent, requireAuth } from "../middleware/auth.middleware.js";
import { reactionLimiter, reportLimiter, writeLimiter } from "../middleware/rate-limit.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import adminRouter from "./admin.routes.js";
import authRouter from "./auth.routes.js";
import marketplaceRouter from "./marketplace.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "farmconnect-api",
  });
});

apiRouter.use("/admin", adminRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/marketplace", marketplaceRouter);
apiRouter.post("/reports", requireAuth, reportLimiter, createReport);
apiRouter.get("/broadcasts", attachUserIfPresent, listBroadcasts);
apiRouter.get("/broadcasts/:id", attachUserIfPresent, getBroadcast);
apiRouter.post("/broadcasts/:id/dismiss", requireAuth, reactionLimiter, dismissBroadcast);
apiRouter.get("/feed", attachUserIfPresent, getFeed);
apiRouter.post("/feed", requireAuth, writeLimiter, upload.array("media", 4), createFeedPost);
apiRouter.get("/feed/:postId", attachUserIfPresent, getFeedPostById);
apiRouter.delete("/feed/:postId", requireAuth, deleteFeedPost);
apiRouter.get("/feed/:postId/comments", getCommentsForPost);
apiRouter.post("/feed/:postId/comments", requireAuth, writeLimiter, createComment);
apiRouter.post("/feed/:postId/like", requireAuth, reactionLimiter, toggleLikedPost);
apiRouter.post("/feed/:postId/save", requireAuth, reactionLimiter, toggleSavedPost);
apiRouter.get("/community", getCommunityOverview);
apiRouter.get("/community/:id", getThreadById);
apiRouter.get("/community/:id/replies", getRepliesForThread);
apiRouter.post("/community", requireAuth, writeLimiter, upload.array("media", 4), createThread);
apiRouter.post("/community/:id/replies", requireAuth, writeLimiter, createReply);
apiRouter.get("/orders", requireAuth, getOrders);
apiRouter.post("/orders", requireAuth, writeLimiter, createOrder);
apiRouter.get("/orders/:orderId", requireAuth, getOrderById);
apiRouter.patch("/orders/:orderId/status", requireAuth, updateOrderStatus);
apiRouter.post("/orders/:orderId/complete", requireAuth, completeOrderWithRemark);
apiRouter.get("/profile/me", requireAuth, getMyProfile);
apiRouter.get("/profile/:userId", attachUserIfPresent, getPublicProfile);
apiRouter.patch("/profile/me", requireAuth, upload.single("avatar"), updateMyProfile);
apiRouter.post("/profile/:userId/follow", requireAuth, reactionLimiter, toggleFollowUser);
apiRouter.post("/profile/notifications/read-all", requireAuth, markAllNotificationsRead);
apiRouter.post("/profile/notifications/:notificationId/read", requireAuth, markNotificationRead);
