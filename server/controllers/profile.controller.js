import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadBufferToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { sanitizeUser } from "./auth.controller.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const [postsCount, listingsCount, ordersCount, notifications, unreadNotifications] = await Promise.all([
    Post.countDocuments({ author: req.user._id }),
    Product.countDocuments({ seller: req.user._id }),
    Order.countDocuments({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    }),
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({
    profile: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      location: req.user.location,
      interests: req.user.interests,
      bio: req.user.bio,
      phone: req.user.phone,
      avatarUrl: req.user.avatarUrl,
      verificationStatus: req.user.verificationStatus,
      trustScore: req.user.trustScore,
    },
    metrics: {
      posts: postsCount,
      listings: listingsCount,
      orders: ordersCount,
    },
    notificationMeta: {
      unreadCount: unreadNotifications,
    },
    notifications,
  });
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
