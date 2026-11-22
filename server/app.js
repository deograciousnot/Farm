import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rate-limit.middleware.js";
import { apiRouter } from "./routes/index.js";

/**
 * Turns an error into what the app should see. Expected problems (bad ids, failed validation, oversized
 * uploads) become 4xx with a readable message; anything unexpected is a 500 whose details stay in the
 * server log, since database and library messages can reveal how the system is built.
 */
function describeError(error) {
  if (error.name === "CastError") {
    return { statusCode: 400, message: `Invalid ${error.path === "_id" ? "id" : error.path}.` };
  }

  if (error.name === "ValidationError") {
    const first = Object.values(error.errors ?? {})[0];
    return { statusCode: 400, message: first?.message || "Some of the details aren't valid." };
  }

  if (error.code === 11000) {
    return { statusCode: 409, message: "That already exists." };
  }

  if (error.name === "MulterError") {
    const message = error.code === "LIMIT_FILE_SIZE" ? "That file is too large. Keep uploads under 40 MB." : "That upload couldn't be accepted.";
    return { statusCode: 400, message };
  }

  // AppErrors and body-parser errors (oversized bodies, bad JSON) carry their own status codes.
  const statusCode = error.statusCode || error.status || 500;

  // AppErrors are written for people (e.g. "SMS isn't set up yet"), so only unplanned failures are hidden.
  if (statusCode >= 500 && error.name !== "AppError" && process.env.NODE_ENV === "production") {
    return { statusCode, message: "Something went wrong on our side. Please try again." };
  }

  return { statusCode, message: error.message || "Something went wrong." };
}

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

  app.use((error, req, res, _next) => {
    const { statusCode, message } = describeError(error);

    if (statusCode >= 500) {
      console.error(`${req.method} ${req.originalUrl} failed`, error);
    }

    res.status(statusCode).json({
      message,
      ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
    });
  });

  return app;
}
