import { Router } from "express";

import { env } from "../config/env.js";
import { getAnalytics, exportRegionalReport } from "../controllers/admin/analytics.controller.js";
import {
  archiveBroadcast,
  createBroadcast,
  createOrganization,
  getAudience,
  listBroadcasts,
  listOrganizations,
  publishBroadcast,
  updateBroadcast,
  updateOrganization,
} from "../controllers/admin/broadcasts.controller.js";
import { cancelOrder, featureProduct, listOrders, listProducts } from "../controllers/admin/market.controller.js";
import {
  actOnReport,
  deleteNotification,
  getOverview,
  listAuditLog,
  listFeedPosts,
  listNotifications,
  listReports,
  listThreads,
  moderateContent,
  pinPost,
  pinThread,
  updateReport,
} from "../controllers/admin/moderation.controller.js";
import { bulkDeleteUsers, listUsers, setStatus, setVerification } from "../controllers/admin/people.controller.js";
import { seedDatabase } from "../data/seed.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const adminRouter = Router();

function requireSeedOrAdminSecret(req, _res, next) {
  // Seeding can wipe the database, so it is off in production unless explicitly enabled.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    next(new AppError("Not found.", 404));
    return;
  }

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

adminRouter.post("/seed", requireSeedOrAdminSecret, asyncHandler(async (req, res) => {
  const reset = req.query.reset === "true" || req.body?.reset === true;
  const summary = await seedDatabase({ reset });

  res.json({
    message: `FarmConnect database ${reset ? "reset and seeded" : "seeded"} successfully.`,
    summary,
  });
}));

// Everything below requires a signed-in admin account.
adminRouter.use(requireAdmin);

adminRouter.get("/me", (req, res) => {
  const { _id, name, email, avatarUrl } = req.user;
  res.json({ admin: { _id, name, email, avatarUrl } });
});

adminRouter.get("/overview", getOverview);

adminRouter.get("/reports", listReports);
adminRouter.patch("/reports/:reportId", updateReport);
adminRouter.post("/reports/:reportId/action", actOnReport);
adminRouter.patch("/content/:targetType/:id/moderation", moderateContent);

adminRouter.get("/feed", listFeedPosts);
adminRouter.patch("/feed/:postId/pin", pinPost);
adminRouter.get("/threads", listThreads);
adminRouter.patch("/threads/:threadId/pin", pinThread);

adminRouter.get("/users", listUsers);
adminRouter.patch("/users/:userId/verification", setVerification);
adminRouter.patch("/users/:userId/status", setStatus);
adminRouter.post("/users/bulk-delete", bulkDeleteUsers);

adminRouter.get("/products", listProducts);
adminRouter.patch("/products/:productId/feature", featureProduct);
adminRouter.get("/orders", listOrders);
adminRouter.patch("/orders/:orderId/cancel", cancelOrder);

adminRouter.get("/analytics", getAnalytics);
adminRouter.get("/analytics/export.csv", exportRegionalReport);

adminRouter.get("/organizations", listOrganizations);
adminRouter.post("/organizations", createOrganization);
adminRouter.patch("/organizations/:organizationId", updateOrganization);
adminRouter.get("/broadcasts", listBroadcasts);
adminRouter.get("/broadcasts/audience", getAudience);
adminRouter.post("/broadcasts", createBroadcast);
adminRouter.patch("/broadcasts/:broadcastId", updateBroadcast);
adminRouter.post("/broadcasts/:broadcastId/publish", publishBroadcast);
adminRouter.post("/broadcasts/:broadcastId/archive", archiveBroadcast);

adminRouter.get("/notifications", listNotifications);
adminRouter.delete("/notifications/:notificationId", deleteNotification);
adminRouter.get("/audit", listAuditLog);

export default adminRouter;
