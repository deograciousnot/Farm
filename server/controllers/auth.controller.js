import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { Comment } from "../models/comment.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { Notification } from "../models/notification.model.js";
import { deleteUserAccount } from "../services/accounts.js";
import { emailIsLive } from "../services/email.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signToken } from "../utils/jwt.js";
import { uploadBufferToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { sendVerificationCode } from "./email-auth.controller.js";

export function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    interests: user.interests,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    phoneVerified: Boolean(user.verifiedPhone),
    // Only email sign-ups that haven't entered their code yet; they can browse but not post.
    needsEmailVerification: Boolean(user.email) && user.emailVerified === false,
    verificationStatus: user.verificationStatus,
    trustScore: user.trustScore,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    createdAt: user.createdAt,
  };
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = "buyer", location = "Unknown", interests = [] } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required.", 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError("An account with that email already exists.", 409);
  }

  // No stock photo: the apps show the person's initials until they upload a picture.
  let avatarUrl = "";

  if (req.file) {
    const uploadedAvatar = await uploadBufferToCloudinary(req.file, {
      folder: "farmconnect/avatars",
    });

    avatarUrl = uploadedAvatar.url;
  }

  let user = await User.create({
    name,
    email,
    password,
    role,
    location,
    interests,
    avatarUrl,
    // Without an email provider in production there is no way to send the code, so don't ask for one.
    ...(emailIsLive() || env.nodeEnv !== "production" ? { emailVerified: false } : {}),
  });

  // The account exists either way; if the email fails to send, they can ask for another code.
  let devCode;
  if (user.emailVerified === false) {
    try {
      devCode = await sendVerificationCode(user);
    } catch (error) {
      console.error("Couldn't send the confirmation email", error.message);
    }
  }

  user = await recalculateTrustScoreForUser(user._id);

  const token = signToken(user);

  res.status(201).json({
    message: "FarmConnect registration successful.",
    token,
    user: sanitizeUser(user),
    ...(devCode && !emailIsLive() ? { devCode } : {}),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.accountStatus === "deleted") {
    throw new AppError("This account has been deleted.", 403);
  }

  if (user.accountStatus === "suspended") {
    throw new AppError(`This account has been suspended. Contact ${env.supportEmail} for help.`, 403);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password.", 401);
  }

  const token = signToken(user);

  res.json({
    message: "FarmConnect login successful.",
    token,
    user: sanitizeUser(user),
  });
});

export const getSession = asyncHandler(async (req, res) => {
  res.json({
    authenticated: true,
    user: sanitizeUser(req.user),
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required.", 400);
  }

  if (String(newPassword).length < 6) {
    throw new AppError("New password must be at least 6 characters.", 400);
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect.", 401);
  }

  user.password = newPassword;
  await user.save();

  res.json({
    message: "Password updated successfully.",
  });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { currentPassword, confirmation } = req.body;

  if (confirmation !== "DELETE") {
    throw new AppError("Type DELETE to confirm account deletion.", 400);
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  // Phone-only accounts have no password; their signed-in session plus typing DELETE is the confirmation.
  if (user.password && !currentPassword) {
    throw new AppError("Current password is required.", 400);
  }

  const isPasswordValid = !user.password || (await user.comparePassword(currentPassword));

  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect.", 401);
  }

  await deleteUserAccount(user);

  res.json({
    message: "Your account and personal data have been deleted.",
  });
});
