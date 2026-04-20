import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadManyToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import mongoose from "mongoose";

function shapePost(post, { savedPostIds = new Set(), likedPostIds = new Set(), commentsByPostId = new Map(), currentUser } = {}) {
  const authorId = String(post.author?._id ?? post.author?.id ?? "");
  const currentUserId = currentUser ? String(currentUser._id) : "";
  const followingIds = new Set((currentUser?.following ?? []).map((entry) => String(entry)));

  return {
    ...post,
    hasSaved: savedPostIds.has(String(post._id)),
    hasLiked: likedPostIds.has(String(post._id)),
    recentComments: commentsByPostId.get(String(post._id)) ?? [],
    isOwner: Boolean(currentUserId) && authorId === currentUserId,
    isFollowingAuthor: Boolean(currentUserId) && followingIds.has(authorId),
    canFollowAuthor: Boolean(currentUserId) && authorId !== currentUserId,
  };
}

export const getFeed = asyncHandler(async (_req, res) => {
  const { filter } = _req.query;
  const filters = {};

  if (filter === "Following") {
    if (!_req.user) {
      res.json({
        highlights: [
          { label: "Verified growers", value: 0 },
          { label: "Sponsored slots live", value: 0 },
          { label: "Market stories trending", value: 0 },
          { label: "Community threads", value: 0 },
        ],
        interestChips: ["All", "Crop health", "Market tea", "Farm inputs", "Buyer demand", "Greenhouse hacks"],
        activeFilter: "All",
        posts: [],
        previewProducts: [],
      });
      return;
    }

    filters.author = { $in: (_req.user.following ?? []).map((entry) => entry) };
  } else if (filter && filter !== "All") {
    filters.$or = [
      { tag: { $regex: filter, $options: "i" } },
      { headline: { $regex: filter, $options: "i" } },
      { body: { $regex: filter, $options: "i" } },
      { postType: { $regex: filter, $options: "i" } },
    ];
  }

  const posts = await Post.find(filters)
    .populate("author", "name role location verificationStatus trustScore avatarUrl")
    .sort({ isSponsored: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const postIds = posts.map((post) => post._id);

  const [previewProducts, activeThreads, verifiedGrowers, comments, savedPosts, likedPosts] = await Promise.all([
    Product.find({ featured: true }).populate("seller", "name location verificationStatus avatarUrl").limit(3),
    CommunityThread.countDocuments(),
    User.countDocuments({ role: "farmer", verificationStatus: { $in: ["verified", "top-rated"] } }),
    Comment.find({ post: { $in: postIds } })
      .populate("author", "name role location avatarUrl")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    _req.user
      ? SavedPost.find({ user: _req.user._id, post: { $in: postIds } }).lean()
      : Promise.resolve([]),
    _req.user
      ? LikedPost.find({ user: _req.user._id, post: { $in: postIds } }).lean()
      : Promise.resolve([]),
  ]);

  const commentsByPostId = new Map();
  const savedPostIds = new Set(savedPosts.map((entry) => String(entry.post)));
  const likedPostIds = new Set(likedPosts.map((entry) => String(entry.post)));

  for (const comment of comments) {
    const key = String(comment.post);
    const currentComments = commentsByPostId.get(key) ?? [];

    if (currentComments.length < 2) {
      currentComments.push({
        _id: comment._id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: comment.author,
      });
      commentsByPostId.set(key, currentComments);
    }
  }

  res.json({
    highlights: [
      { label: "Verified growers", value: verifiedGrowers },
      { label: "Sponsored slots live", value: posts.filter((post) => post.isSponsored).length },
      { label: "Market stories trending", value: posts.filter((post) => post.postType === "market").length },
      { label: "Community threads", value: activeThreads },
    ],
    interestChips: _req.user
      ? ["All", "Following", "Crop health", "Market tea", "Farm inputs", "Buyer demand", "Greenhouse hacks"]
      : ["All", "Crop health", "Market tea", "Farm inputs", "Buyer demand", "Greenhouse hacks"],
    activeFilter: filter || "All",
    posts: posts.map((post) => ({
      ...shapePost(post, { savedPostIds, likedPostIds, commentsByPostId, currentUser: _req.user }),
    })),
    previewProducts,
  });
});

export const getFeedPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  const post = await Post.findById(postId)
    .populate("author", "name role location verificationStatus trustScore avatarUrl followers following")
    .lean();

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  const [comments, savedPost, likedPost] = await Promise.all([
    Comment.find({ post: post._id })
      .populate("author", "name role location avatarUrl verificationStatus")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    req.user ? SavedPost.findOne({ user: req.user._id, post: post._id }).lean() : Promise.resolve(null),
    req.user ? LikedPost.findOne({ user: req.user._id, post: post._id }).lean() : Promise.resolve(null),
  ]);

  const commentsByPostId = new Map([[String(post._id), comments]]);

  res.json({
    item: shapePost(post, {
      savedPostIds: new Set(savedPost ? [String(post._id)] : []),
      likedPostIds: new Set(likedPost ? [String(post._id)] : []),
      commentsByPostId,
      currentUser: req.user,
    }),
  });
});

export const createFeedPost = asyncHandler(async (req, res) => {
  const { headline, body, tag = "", location = "", postType = "knowledge" } = req.body;

  if (!headline || !body) {
    throw new AppError("Headline and body are required.", 400);
  }

  const media = await uploadManyToCloudinary(req.files, {
    folder: "farmconnect/feed",
  });

  const post = await Post.create({
    author: req.user._id,
    headline,
    body,
    tag,
    location,
    postType,
    media,
  });

  const populatedPost = await Post.findById(post._id)
    .populate("author", "name role location verificationStatus trustScore avatarUrl")
    .lean();

  await recalculateTrustScoreForUser(req.user._id);

  res.status(201).json({
    message: "Post shared successfully.",
    item: shapePost(populatedPost, {
      currentUser: req.user,
    }),
  });
});

export const deleteFeedPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  if (String(post.author) !== String(req.user._id)) {
    throw new AppError("You can only delete your own posts.", 403);
  }

  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    SavedPost.deleteMany({ post: post._id }),
    LikedPost.deleteMany({ post: post._id }),
    Notification.deleteMany({
      type: { $in: ["like", "comment"] },
      body: { $regex: post.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }),
  ]);

  await post.deleteOne();
  await recalculateTrustScoreForUser(req.user._id);

  res.json({
    message: "Post deleted successfully.",
    postId,
  });
});
