import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rate-limit.middleware.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  // Render (and most hosts) sit behind one proxy; trust it so rate limits see the real client IP.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  // JSON bodies are small text; media goes through multipart uploads with their own limits.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowedOrigin = origin && (env.allowedOrigins.length === 0 || env.allowedOrigins.includes(origin));

    if (isAllowedOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-secret, x-seed-secret");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      name: "FarmConnect API",
      status: "ok",
      message:
        "FarmConnect backend is running with Mongo-backed auth, feed, marketplace, community, profile, and orders APIs.",
    });
  });

  app.use("/api", globalLimiter, apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      message: `Route ${req.method} ${req.originalUrl} was not found.`,
    });
  });

  app.use((error, _req, res, _next) => {
    // Oversized bodies and bad JSON come from the body parser with their own status codes.
    const statusCode = error.statusCode || error.status || 500;

    res.status(statusCode).json({
      message: error.message || "Something went wrong.",
      ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
    });
  });

  return app;
}
