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
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signToken } from "../utils/jwt.js";
import { uploadBufferToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

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

  let avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(email.toLowerCase())}`;

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
  });

  user = await recalculateTrustScoreForUser(user._id);

  const token = signToken(user);

  res.status(201).json({
    message: "FarmConnect registration successful.",
    token,
    user: sanitizeUser(user),
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

  if (!currentPassword) {
    throw new AppError("Current password is required.", 400);
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect.", 401);
  }

  const userId = user._id;
  const [posts, threads] = await Promise.all([
    Post.find({ author: userId }).select("_id").lean(),
    CommunityThread.find({ author: userId }).select("_id").lean(),
  ]);
  const postIds = posts.map((post) => post._id);
  const threadIds = threads.map((thread) => thread._id);

  await Promise.all([
    Comment.deleteMany({ $or: [{ author: userId }, { post: { $in: postIds } }] }),
    LikedPost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    SavedPost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    SellerRemark.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
    ThreadReply.deleteMany({ $or: [{ author: userId }, { thread: { $in: threadIds } }] }),
    Post.deleteMany({ author: userId }),
    Product.deleteMany({ seller: userId }),
    CommunityThread.deleteMany({ author: userId }),
    Notification.deleteMany({ user: userId }),
    User.updateMany({}, { $pull: { followers: userId, following: userId } }),
    Order.updateMany(
      { buyer: userId },
      {
        $set: {
          deliveryContact: "",
          deliveryLocation: "Removed at account deletion",
          note: "",
        },
      }
    ),
    Order.updateMany(
      { seller: userId },
      {
        $set: {
          note: "",
        },
      }
    ),
  ]);

  user.name = "Deleted account";
  user.email = `deleted-${userId}@farmconnect.local`;
  user.password = `${userId}-${Date.now()}-disabled`;
  user.role = "buyer";
  user.location = "Removed";
  user.interests = [];
  user.bio = "";
  user.avatarUrl = "";
  user.phone = "";
  user.verificationStatus = "unverified";
  user.trustScore = 0;
  user.following = [];
  user.followers = [];
  user.accountStatus = "deleted";
  user.deletedAt = new Date();
  await user.save();

  res.json({
    message: "Your account and personal data have been deleted.",
  });
});
