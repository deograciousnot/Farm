import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { OtpCode } from "../models/otp-code.model.js";
import { User } from "../models/user.model.js";
import { sendSms, smsIsLive } from "../services/sms.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signToken } from "../utils/jwt.js";
import { maskPhone, normalizeKenyanPhone } from "../utils/phone.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { sanitizeUser } from "./auth.controller.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const SIGNUP_TOKEN_TTL = "20m";
const ROLES = ["farmer", "buyer", "hobbyist"];

function hashCode(phone, code) {
  return crypto.createHmac("sha256", env.jwtSecret).update(`${phone}:${code}`).digest("hex");
}

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
  const now = Date.now();

  const recent = await OtpCode.find({ phone, createdAt: { $gte: new Date(now - 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  if (recent[0] && now - new Date(recent[0].createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - new Date(recent[0].createdAt).getTime())) / 1000);
    throw new AppError(`Please wait ${wait} seconds before asking for another code.`, 429);
  }

  if (recent.length >= MAX_CODES_PER_HOUR) {
    throw new AppError("Too many codes requested for this number. Please try again in an hour.", 429);
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  // Only the newest code is valid, so a later request replaces earlier ones.
  await OtpCode.deleteMany({ phone });
  await OtpCode.create({ phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + CODE_TTL_MS) });

  try {
    await sendSms(phone, `Your FarmConnect code is ${code}. It expires in 10 minutes. Never share it with anyone.`);
  } catch (error) {
    await OtpCode.deleteMany({ phone });
    throw error;
  }

  res.json({
    message: `We sent a code to ${maskPhone(phone)}.`,
    phone,
    expiresInSeconds: CODE_TTL_MS / 1000,
    resendInSeconds: RESEND_COOLDOWN_MS / 1000,
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
  const code = String(req.body.code ?? "").replace(/\D/g, "");
  const record = await OtpCode.findOne({ phone, expiresAt: { $gt: new Date() } });

  if (!record) {
    throw new AppError("That code has expired. Ask for a new one.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ _id: record._id });
    throw new AppError("Too many wrong codes. Ask for a new one.", 429);
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");

  if (code.length !== 6 || !crypto.timingSafeEqual(expected, actual)) {
    record.attempts += 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw new AppError(left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.", 400);
  }

  await OtpCode.deleteMany({ phone });

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
