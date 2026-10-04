import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 * Request limits that stop scripted abuse (account farming, password guessing, spam floods).
 * Limits are per signed-in member where we know who it is, otherwise per IP address.
 * The store is in memory, which is right for a single server instance; switch to a shared
 * store (e.g. Redis) if the API ever runs on several instances.
 */

const MINUTE = 60 * 1000;

function limiter({ windowMs, limit, message, byUser = false, keyPrefix }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${keyPrefix}:${byUser && req.user ? `user:${req.user._id}` : `ip:${ipKeyGenerator(req.ip)}`}`,
    handler: (_req, res) => res.status(429).json({ message }),
  });
}

/** Every API request: generous, only catches floods. */
export const globalLimiter = limiter({
  keyPrefix: "global",
  windowMs: MINUTE,
  limit: 300,
  message: "Too many requests. Please slow down and try again in a minute.",
});

/**
 * Sign-in attempts per account per network: blocks password guessing without locking out everyone
 * who shares an IP (Kenyan mobile networks put many subscribers behind one address).
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `login:${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? req.body?.phone ?? "").toLowerCase().trim()}`,
  handler: (_req, res) => res.status(429).json({ message: "Too many sign-in attempts for this account. Please wait 15 minutes and try again." }),
});

/** All sign-in attempts from one network: a loose cap that only stops bulk credential stuffing. */
export const loginNetworkLimiter = limiter({
  keyPrefix: "login-ip",
  windowMs: 15 * MINUTE,
  limit: 100,
  message: "Too many sign-in attempts from this network. Please try again later.",
});

/** New accounts per network. Kept loose for shared IPs (e.g. a cooperative signing members up together). */
export const registerLimiter = limiter({
  keyPrefix: "register",
  windowMs: 60 * MINUTE,
  limit: 20,
  message: "Too many new accounts from this network. Please try again later.",
});

/** One-time codes per network (codes are also limited per phone number in the OTP service). */
export const otpLimiter = limiter({
  keyPrefix: "otp",
  windowMs: 60 * MINUTE,
  limit: 10,
  message: "Too many code requests. Please try again in an hour.",
});

/** Posts, questions, answers, comments, listings, orders: per member. */
export const writeLimiter = limiter({
  keyPrefix: "write",
  byUser: true,
  windowMs: 10 * MINUTE,
  limit: 20,
  message: "You're posting very quickly. Please wait a few minutes before posting again.",
});

/** Likes, saves, follows: cheap but easy to script. */
export const reactionLimiter = limiter({
  keyPrefix: "reaction",
  byUser: true,
  windowMs: MINUTE,
  limit: 60,
  message: "Too many actions in a short time. Please wait a moment.",
});

export const reportLimiter = limiter({
  keyPrefix: "report",
  byUser: true,
  windowMs: 60 * MINUTE,
  limit: 20,
  message: "You've sent a lot of reports. Our moderators will get to them; please try again later.",
});
