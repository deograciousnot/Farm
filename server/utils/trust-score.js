import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { User } from "../models/user.model.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

export async function recalculateTrustScoreForUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  const [
    postsCount,
    listingsCount,
    threadsCount,
    commentsCount,
    buyerOrdersCount,
    sellerOrdersCount,
    deliveredSales,
    remarkStats,
  ] =
    await Promise.all([
      Post.countDocuments({ author: user._id }),
      Product.countDocuments({ seller: user._id }),
      CommunityThread.countDocuments({ author: user._id }),
      Comment.countDocuments({ author: user._id }),
      Order.countDocuments({ buyer: user._id }),
      Order.countDocuments({ seller: user._id }),
      Order.countDocuments({ seller: user._id, status: "delivered" }),
      SellerRemark.aggregate([
        { $match: { seller: user._id } },
        { $group: { _id: "$seller", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

  let score = 0.9;

  if (user.avatarUrl) {
    score += 0.35;
  }

  if (user.bio) {
    score += 0.35;
  }

  if (user.phone) {
    score += 0.45;
  }

  if (user.location && user.location !== "Unknown") {
    score += 0.25;
  }

  if (Array.isArray(user.interests) && user.interests.length) {
    score += 0.25;
  }

  const socialActivity = postsCount + threadsCount + commentsCount;
  score += Math.min(0.8, socialActivity * 0.1);

  if (user.role === "farmer") {
    score += 0.6;
    score += Math.min(0.7, listingsCount * 0.18);
    score += Math.min(1.1, deliveredSales * 0.3 + sellerOrdersCount * 0.08);
    if (remarkStats[0]?.count) {
      score += Math.min(0.9, (remarkStats[0].avgRating / 5) * 0.7 + remarkStats[0].count * 0.08);
    }
  } else {
    score += Math.min(0.9, buyerOrdersCount * 0.22);
  }

  const nextTrustScore = roundToOneDecimal(clamp(score, 0, 5));

  let nextVerificationStatus = user.verificationStatus;

  if (user.role === "farmer") {
    if (nextTrustScore >= 4.6 && deliveredSales >= 2) {
      nextVerificationStatus = "top-rated";
    } else if (nextTrustScore >= 2.8) {
      nextVerificationStatus = "verified";
    } else {
      nextVerificationStatus = "unverified";
    }
  } else if (nextTrustScore >= 2.4 && user.phone) {
    nextVerificationStatus = "verified";
  } else {
    nextVerificationStatus = "unverified";
  }

  user.trustScore = nextTrustScore;
  user.verificationStatus = nextVerificationStatus;
  await user.save();

  return user;
}
