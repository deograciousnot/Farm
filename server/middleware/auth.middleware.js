import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// The app signs out when it sees this message, so keep it in step with isStaleSessionError in client/mobile/lib/api.ts.
const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

function extractToken(req) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return null;
}

/** Returns the member a session token belongs to, or throws a 401 if it is invalid, expired or revoked. */
async function userFromToken(token) {
  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(SESSION_EXPIRED, 401);
  }

  // Short-lived sign-up tokens are signed with the same key but carry no member id.
  if (!payload.sub || payload.purpose) {
    throw new AppError(SESSION_EXPIRED, 401);
  }

  const user = await User.findById(payload.sub);

  if (!user || user.accountStatus === "deleted") {
    throw new AppError("User no longer exists.", 401);
  }

  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError(SESSION_EXPIRED, 401);
  }

  return user;
}

export const attachUserIfPresent = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const user = await userFromToken(token);

    if (user.accountStatus === "active") {
      req.user = user;
    }
  } catch (_error) {
    // Treat invalid optional auth as anonymous traffic.
  }

  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new AppError("Authentication token is required.", 401);
  }

  const user = await userFromToken(token);

  if (user.accountStatus === "suspended") {
    throw new AppError(`This account has been suspended. Contact ${env.supportEmail} for help.`, 403);
  }

  req.user = user;
  next();
});

/** Admin dashboard access: a signed-in account with isAdmin set. */
export const requireAdmin = [
  requireAuth,
  (req, _res, next) => {
    if (!req.user?.isAdmin) {
      return next(new AppError("Admin access is required.", 403));
    }

    return next();
  },
];

export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user) {
      return next(new AppError("Authentication is required.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(`This action requires one of the following roles: ${allowedRoles.join(", ")}.`, 403)
      );
    }

    return next();
  };
}
