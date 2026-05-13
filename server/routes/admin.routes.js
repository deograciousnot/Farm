import { Router } from "express";

import { seedDatabase } from "../data/seed.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const adminRouter = Router();

function requireSeedSecret(req, _res, next) {
  const expectedSecret = process.env.SEED_SECRET;
  const providedSecret = req.header("x-seed-secret") || req.body?.secret;

  if (!expectedSecret) {
    next(new AppError("SEED_SECRET is not configured.", 503));
    return;
  }

  if (providedSecret !== expectedSecret) {
    next(new AppError("Invalid seed secret.", 403));
    return;
  }

  next();
}

adminRouter.post(
  "/seed",
  requireSeedSecret,
  asyncHandler(async (_req, res) => {
    const summary = await seedDatabase();

    res.json({
      message: "FarmConnect database seeded successfully.",
      summary,
    });
  })
);

export default adminRouter;
