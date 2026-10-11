import { Router } from "express";

import {
  createPartnerBroadcast,
  deletePartnerBroadcast,
  getPartnerAudience,
  getPartnerProfile,
  listPartnerBroadcasts,
  submitPartnerBroadcast,
  updatePartnerBroadcast,
  withdrawPartnerBroadcast,
} from "../controllers/partner.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { writeLimiter } from "../middleware/rate-limit.middleware.js";

/** The partner dashboard: organisation staff draft updates for FarmConnect to review. */
const partnerRouter = Router();

partnerRouter.use(requireAuth);
partnerRouter.get("/me", getPartnerProfile);
partnerRouter.get("/broadcasts", listPartnerBroadcasts);
partnerRouter.get("/broadcasts/audience", getPartnerAudience);
partnerRouter.post("/broadcasts", writeLimiter, createPartnerBroadcast);
partnerRouter.patch("/broadcasts/:broadcastId", updatePartnerBroadcast);
partnerRouter.post("/broadcasts/:broadcastId/submit", submitPartnerBroadcast);
partnerRouter.post("/broadcasts/:broadcastId/withdraw", withdrawPartnerBroadcast);
partnerRouter.delete("/broadcasts/:broadcastId", deletePartnerBroadcast);

export default partnerRouter;
