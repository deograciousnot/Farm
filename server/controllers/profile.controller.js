import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadBufferToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { sanitizeUser } from "./auth.controller.js";

function shapeProfileSummary(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    role: user.role,
    location: user.location,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    phone: user.phone,
    verificationStatus: user.verificationStatus,
    trustScore: user.trustScore,
    interests: user.interests ?? [],
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
  };
}

async function buildProfilePayload(viewer, targetUser, { includeNotifications = false } = {}) {
  const [posts, listings, ordersCount, notifications, unreadNotifications, receivedRemarks, givenRemarks] = await Promise.all([
    Post.find({ author: targetUser._id })
      .populate("author", "name role location verificationStatus trustScore avatarUrl followers following")
      .sort({ createdAt: -1 })
      .limit(24)
      .lean(),
    Product.find({ seller: targetUser._id })
      .populate("seller", "name role location verificationStatus trustScore avatarUrl followers following")
      .sort({ createdAt: -1 })
      .limit(24)
      .lean(),
    includeNotifications
      ? Order.countDocuments({
          $or: [{ buyer: targetUser._id }, { seller: targetUser._id }],
        })
      : Promise.resolve(0),
    includeNotifications
      ? Notification.find({ user: targetUser._id }).sort({ createdAt: -1 }).limit(5)
      : Promise.resolve([]),
    includeNotifications
      ? Notification.countDocuments({ user: targetUser._id, isRead: false })
      : Promise.resolve(0),
    SellerRemark.find({ seller: targetUser._id })
      .populate("buyer", "name role location avatarUrl verificationStatus trustScore")
      .populate("seller", "name role location avatarUrl verificationStatus trustScore")
      .sort({ createdAt: -1 })
      .limit(includeNotifications ? 24 : 8)
      .lean(),
    includeNotifications
      ? SellerRemark.find({ buyer: targetUser._id })
          .populate("buyer", "name role location avatarUrl verificationStatus trustScore")
          .populate("seller", "name role location avatarUrl verificationStatus trustScore")
          .sort({ createdAt: -1 })
          .limit(24)
          .lean()
      : Promise.resolve([]),
  ]);

  const followers = await User.find({ _id: { $in: targetUser.followers ?? [] } })
    .select("name role location avatarUrl verificationStatus trustScore followers following")
    .lean();
  const following = await User.find({ _id: { $in: targetUser.following ?? [] } })
    .select("name role location avatarUrl verificationStatus trustScore followers following")
    .lean();

  const viewerId = viewer ? String(viewer._id) : "";
  const targetId = String(targetUser._id);
  const isOwner = Boolean(viewerId) && viewerId === targetId;
  const isFollowing = Boolean(viewerId) && (targetUser.followers ?? []).some((entry) => String(entry) === viewerId);

  return {
    profile: shapeProfileSummary(targetUser),
    metrics: {
      posts: posts.length,
      listings: listings.length,
      orders: ordersCount,
    },
    socialGraph: {
      isOwner,
      isFollowing,
      followers: followers.map(shapeProfileSummary),
      following: following.map(shapeProfileSummary),
    },
    posts,
    listings,
    notificationMeta: {
      unreadCount: unreadNotifications,
    },
    notifications,
    remarks: {
      received: receivedRemarks,
      given: givenRemarks,
    },
  };
}

export const getMyProfile = asyncHandler(async (req, res) => {
  const payload = await buildProfilePayload(req.user, req.user, { includeNotifications: true });

  res.json({
    ...payload,
    profile: {
      ...payload.profile,
      email: req.user.email,
    },
  });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.userId);

  if (!targetUser) {
    throw new AppError("User not found.", 404);
  }

  const payload = await buildProfilePayload(req.user, targetUser);
  res.json(payload);
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, location, bio, phone, interests } = req.body;

  if (typeof name === "string") {
    req.user.name = name.trim();
  }

  if (typeof location === "string") {
    req.user.location = location.trim();
  }

  if (typeof bio === "string") {
    req.user.bio = bio.trim();
  }

  if (typeof phone === "string") {
    req.user.phone = phone.trim();
  }

  if (interests !== undefined) {
    const parsedInterests = Array.isArray(interests)
      ? interests
      : String(interests)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    if (!Array.isArray(parsedInterests)) {
      throw new AppError("Interests must be a list.", 400);
    }

    req.user.interests = parsedInterests;
  }

  if (req.file) {
    const uploadedAvatar = await uploadBufferToCloudinary(req.file, {
      folder: "farmconnect/avatars",
    });

    req.user.avatarUrl = uploadedAvatar.url;
  }

  await req.user.save();
  const refreshedUser = await recalculateTrustScoreForUser(req.user._id);

  res.json({
    message: "Profile updated successfully.",
    user: sanitizeUser(refreshedUser),
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    user: req.user._id,
  });

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.json({
    message: "Notification marked as read.",
    item: notification,
    unreadCount,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user._id,
      isRead: false,
    },
    {
      $set: { isRead: true },
    }
  );

  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);

  res.json({
    message: "All notifications marked as read.",
    items: notifications,
    unreadCount: 0,
  });
});

export const toggleFollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (String(req.user._id) === String(userId)) {
    throw new AppError("You cannot follow yourself.", 400);
  }

  const targetUser = await User.findById(userId);

  if (!targetUser) {
    throw new AppError("User not found.", 404);
  }

  const alreadyFollowing = req.user.following.some((entry) => String(entry) === String(targetUser._id));

  if (alreadyFollowing) {
    req.user.following = req.user.following.filter((entry) => String(entry) !== String(targetUser._id));
    targetUser.followers = targetUser.followers.filter((entry) => String(entry) !== String(req.user._id));
  } else {
    req.user.following.push(targetUser._id);
    targetUser.followers.push(req.user._id);
  }

  await Promise.all([req.user.save(), targetUser.save()]);

  res.json({
    following: !alreadyFollowing,
    followersCount: targetUser.followers.length,
    followingCount: req.user.following.length,
  });
});
