import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { sendSms, smsIsLive } from "../services/sms.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signToken } from "../utils/jwt.js";
import { CODE_TTL_SECONDS, RESEND_COOLDOWN_SECONDS, consumeCode, issueCode } from "../utils/one-time-code.js";
import { maskPhone, normalizeKenyanPhone } from "../utils/phone.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { sanitizeUser } from "./auth.controller.js";

const SIGNUP_TOKEN_TTL = "20m";
const ROLES = ["farmer", "buyer", "hobbyist"];
const PURPOSE = "phone-sign-in";

function requirePhone(input) {
  const phone = normalizeKenyanPhone(input);
  if (!phone) {
    throw new AppError("Enter a Kenyan mobile number, like 0712 345 678.", 400);
  }
  return phone;
}

/** Step 1: text a 6-digit code to the number. */
export const requestCode = asyncHandler(async (req, res) => {
  const phone = requirePhone(req.body.phone);
  const code = await issueCode({
    target: phone,
    purpose: PURPOSE,
    deliver: (value) => sendSms(phone, `Your FarmConnect code is ${value}. It expires in 10 minutes. Never share it with anyone.`),
  });

  res.json({
    message: `We sent a code to ${maskPhone(phone)}.`,
    phone,
    expiresInSeconds: CODE_TTL_SECONDS,
    resendInSeconds: RESEND_COOLDOWN_SECONDS,
    // Local development only: with no SMS provider configured, hand the code back so it can be typed in.
    ...(!smsIsLive() && env.nodeEnv !== "production" ? { devCode: code } : {}),
  });
});

/**
 * Step 2: check the code. Existing members are signed in; a new number gets a short-lived
 * sign-up token to finish their profile.
 */
export const verifyCode = asyncHandler(async (req, res) => {
  const phone = requirePhone(req.body.phone);
  await consumeCode({ target: phone, purpose: PURPOSE, code: req.body.code });

  const user = await User.findOne({ verifiedPhone: phone });

  if (user) {
    if (user.accountStatus === "suspended") {
      throw new AppError("This account has been suspended. Contact support@farmconnect.app for help.", 403);
    }
    if (user.accountStatus === "deleted") {
      throw new AppError("This account has been deleted.", 403);
    }
    return res.json({ message: "Signed in.", token: signToken(user), user: sanitizeUser(user) });
  }

  const signupToken = jwt.sign({ purpose: "phone-signup", phone }, env.jwtSecret, { expiresIn: SIGNUP_TOKEN_TTL });
  res.json({ message: "Number confirmed. Tell us a little about yourself.", needsProfile: true, signupToken, phone });
});

/** Step 3 (new numbers only): create the account. */
export const completePhoneSignup = asyncHandler(async (req, res) => {
  let claims;
  try {
    claims = jwt.verify(String(req.body.signupToken ?? ""), env.jwtSecret);
  } catch {
    throw new AppError("This sign-up has expired. Start again with your phone number.", 401);
  }

  if (claims.purpose !== "phone-signup" || !claims.phone) {
    throw new AppError("This sign-up has expired. Start again with your phone number.", 401);
  }

  const name = String(req.body.name ?? "").trim();
  const location = String(req.body.location ?? "").trim();
  const role = ROLES.includes(req.body.role) ? req.body.role : "farmer";

  if (name.length < 2) {
    throw new AppError("Tell us your name or farm name.", 400);
  }

  if (await User.exists({ verifiedPhone: claims.phone })) {
    throw new AppError("This number already has an account. Sign in instead.", 409);
  }

  let user = await User.create({
    name,
    role,
    location: location || "Unknown",
    phone: claims.phone,
    verifiedPhone: claims.phone,
    interests: Array.isArray(req.body.interests) ? req.body.interests.slice(0, 10) : [],
    avatarUrl: "",
  });
  user = (await recalculateTrustScoreForUser(user._id)) ?? user;

  res.status(201).json({ message: "Welcome to FarmConnect.", token: signToken(user), user: sanitizeUser(user) });
});
