import { Router } from "express";

import { boostListing, buySponsoredCredits, getPayment, getPlans, mpesaCallback } from "../controllers/payments.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { writeLimiter } from "../middleware/rate-limit.middleware.js";

/** M-Pesa payments: listing boosts for sellers and sponsored-update credits for companies. */
const paymentsRouter = Router();

paymentsRouter.get("/plans", getPlans);
paymentsRouter.post("/mpesa/callback/:secret", mpesaCallback);
paymentsRouter.post("/boost", requireAuth, writeLimiter, boostListing);
paymentsRouter.post("/sponsored-credits", requireAuth, writeLimiter, buySponsoredCredits);
paymentsRouter.get("/:paymentId", requireAuth, getPayment);

export default paymentsRouter;
