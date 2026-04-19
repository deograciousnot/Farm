import { Router } from "express";

import {
  createReply,
  createThread,
  getCommunityOverview,
  getRepliesForThread,
  getThreadById,
} from "../controllers/community.controller.js";
import { createComment, getCommentsForPost, toggleLikedPost, toggleSavedPost } from "../controllers/comments.controller.js";
import { createFeedPost, getFeed } from "../controllers/feed.controller.js";
import { createOrder, getOrders } from "../controllers/orders.controller.js";
import {
  getMyProfile,
  markAllNotificationsRead,
  markNotificationRead,
  updateMyProfile,
} from "../controllers/profile.controller.js";
import { attachUserIfPresent, requireAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import authRouter from "./auth.routes.js";
import marketplaceRouter from "./marketplace.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "farmconnect-api",
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/marketplace", marketplaceRouter);
apiRouter.get("/feed", attachUserIfPresent, getFeed);
apiRouter.post("/feed", requireAuth, upload.array("media", 4), createFeedPost);
apiRouter.get("/feed/:postId/comments", getCommentsForPost);
apiRouter.post("/feed/:postId/comments", requireAuth, createComment);
apiRouter.post("/feed/:postId/like", requireAuth, toggleLikedPost);
apiRouter.post("/feed/:postId/save", requireAuth, toggleSavedPost);
apiRouter.get("/community", getCommunityOverview);
apiRouter.get("/community/:id", getThreadById);
apiRouter.get("/community/:id/replies", getRepliesForThread);
apiRouter.post("/community", requireAuth, createThread);
apiRouter.post("/community/:id/replies", requireAuth, createReply);
apiRouter.get("/orders", requireAuth, getOrders);
apiRouter.post("/orders", requireAuth, createOrder);
apiRouter.get("/profile/me", requireAuth, getMyProfile);
apiRouter.patch("/profile/me", requireAuth, upload.single("avatar"), updateMyProfile);
apiRouter.post("/profile/notifications/read-all", requireAuth, markAllNotificationsRead);
apiRouter.post("/profile/notifications/:notificationId/read", requireAuth, markNotificationRead);
