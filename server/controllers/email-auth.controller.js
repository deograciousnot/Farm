import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { codeEmail, emailIsLive, sendEmail } from "../services/email.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signToken } from "../utils/jwt.js";
import { RESEND_COOLDOWN_SECONDS, consumeCode, issueCode } from "../utils/one-time-code.js";
import { sanitizeUser } from "./auth.controller.js";

const showDevCode = () => !emailIsLive() && env.nodeEnv !== "production";

function normalizeEmail(input) {
  return String(input ?? "").toLowerCase().trim();
}

/** Emails a confirmation code. Used right after sign-up and from the "resend" button. */
export async function sendVerificationCode(user) {
  return issueCode({
    target: user.email,
    purpose: "verify-email",
    deliver: (code) => sendEmail({ to: user.email, ...codeEmail(code, "confirm your email address") }),
  });
}

export const resendVerification = asyncHandler(async (req, res) => {
  if (!req.user.email || req.user.emailVerified !== false) {
    return res.json({ message: "Your email address is already confirmed.", alreadyVerified: true });
  }

  const code = await sendVerificationCode(req.user);
  res.json({
    message: `We sent a new code to ${req.user.email}.`,
    resendInSeconds: RESEND_COOLDOWN_SECONDS,
    ...(showDevCode() ? { devCode: code } : {}),
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.emailVerified !== false) {
    return res.json({ message: "Your email address is already confirmed.", user: sanitizeUser(user) });
  }

  await consumeCode({ target: user.email, purpose: "verify-email", code: req.body.code });
  user.emailVerified = true;
  await user.save();

  res.json({ message: "Email confirmed. You're all set.", user: sanitizeUser(user) });
});

/** Always answers the same way so the form can't be used to discover which emails have accounts. */
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError("Enter the email address you signed up with.", 400);
  }

  const user = await User.findOne({ email, accountStatus: "active" }).select("_id email");
  let code;

  if (user) {
    code = await issueCode({
      target: email,
      purpose: "reset-password",
      deliver: (value) => sendEmail({ to: email, ...codeEmail(value, "reset your password") }),
    });
  } else if (!emailIsLive() && env.nodeEnv === "production") {
    // Match the error a real account would get, so the response doesn't reveal anything.
    throw new AppError("Email isn't set up yet. Please sign in with your phone number for now.", 503);
  }

  res.json({
    message: "If that email has a FarmConnect account, we've sent it a code.",
    resendInSeconds: RESEND_COOLDOWN_SECONDS,
    ...(code && showDevCode() ? { devCode: code } : {}),
  });
});

/** Sets a new password with the emailed code and signs the member in. */
export const resetPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const newPassword = String(req.body.newPassword ?? "");

  if (newPassword.length < 6) {
    throw new AppError("Your new password must be at least 6 characters.", 400);
  }

  await consumeCode({ target: email, purpose: "reset-password", code: req.body.code });

  const user = await User.findOne({ email, accountStatus: "active" });
  if (!user) {
    throw new AppError("That code has expired. Ask for a new one.", 400);
  }

  user.password = newPassword;
  // They just proved they can read this inbox.
  if (user.emailVerified === false) user.emailVerified = true;
  await user.save();

  res.json({ message: "Password updated. You're signed in.", token: signToken(user), user: sanitizeUser(user) });
});
