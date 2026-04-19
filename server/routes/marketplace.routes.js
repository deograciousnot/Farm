import { Router } from "express";

import {
  createProduct,
  getMarketplaceOverview,
  getProductById,
  getProducts,
} from "../controllers/marketplace.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const marketplaceRouter = Router();

marketplaceRouter.get("/overview", getMarketplaceOverview);
marketplaceRouter.get("/products", getProducts);
marketplaceRouter.get("/products/:id", getProductById);
marketplaceRouter.post(
  "/products",
  requireAuth,
  requireRole("farmer"),
  upload.array("media", 6),
  createProduct
);

export default marketplaceRouter;
