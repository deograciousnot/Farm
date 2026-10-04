import crypto from "node:crypto";

import { env } from "../config/env.js";
import { OtpCode } from "../models/otp-code.model.js";
import { AppError } from "./app-error.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export const CODE_TTL_SECONDS = CODE_TTL_MS / 1000;
export const RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_MS / 1000;

function hashCode(target, purpose, code) {
  return crypto.createHmac("sha256", env.jwtSecret).update(`${purpose}:${target}:${code}`).digest("hex");
}

/**
 * Creates a fresh 6-digit code for `target` and hands it to `deliver`. Enforces a resend cooldown and
 * an hourly cap per target, and only the newest code is valid. Returns the code so development builds
 * can show it when no SMS/email provider is configured.
 */
export async function issueCode({ target, purpose, deliver }) {
  const now = Date.now();
  const recent = await OtpCode.find({ target, purpose, createdAt: { $gte: new Date(now - 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  if (recent[0]) {
    const elapsed = now - new Date(recent[0].createdAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new AppError(`Please wait ${Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)} seconds before asking for another code.`, 429);
    }
  }

  if (recent.length >= MAX_CODES_PER_HOUR) {
    throw new AppError("Too many codes requested. Please try again in an hour.", 429);
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await OtpCode.deleteMany({ target, purpose });
  await OtpCode.create({ target, purpose, codeHash: hashCode(target, purpose, code), expiresAt: new Date(now + CODE_TTL_MS) });

  try {
    await deliver(code);
  } catch (error) {
    await OtpCode.deleteMany({ target, purpose });
    throw error;
  }

  return code;
}

/** Checks a code and consumes it. Throws a friendly error when it's wrong, expired or out of tries. */
export async function consumeCode({ target, purpose, code }) {
  const digits = String(code ?? "").replace(/\D/g, "");
  const record = await OtpCode.findOne({ target, purpose, expiresAt: { $gt: new Date() } });

  if (!record) {
    throw new AppError("That code has expired. Ask for a new one.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ _id: record._id });
    throw new AppError("Too many wrong codes. Ask for a new one.", 429);
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(target, purpose, digits), "hex");

  if (digits.length !== 6 || !crypto.timingSafeEqual(expected, actual)) {
    record.attempts += 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw new AppError(left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.", 400);
  }

  await OtpCode.deleteMany({ target, purpose });
}
