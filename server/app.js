import cookieParser from "cookie-parser";
import express from "express";

import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.json({
      name: "FarmConnect API",
      status: "ok",
      message:
        "FarmConnect backend is running with Mongo-backed auth, feed, marketplace, community, profile, and orders APIs.",
    });
  });

  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      message: `Route ${req.method} ${req.originalUrl} was not found.`,
    });
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      message: error.message || "Something went wrong.",
      ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
    });
  });

  return app;
}
