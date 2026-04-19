import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadManyToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

export const getFeed = asyncHandler(async (_req, res) => {
  const { filter } = _req.query;
  const filters = {};

  if (filter && filter !== "All") {
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
    interestChips: ["All", "Crop health", "Market tea", "Farm inputs", "Buyer demand", "Greenhouse hacks"],
    activeFilter: filter || "All",
    posts: posts.map((post) => ({
      ...post,
      hasSaved: savedPostIds.has(String(post._id)),
      hasLiked: likedPostIds.has(String(post._id)),
      recentComments: commentsByPostId.get(String(post._id)) ?? [],
    })),
    previewProducts,
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
    item: {
      ...populatedPost,
      hasSaved: false,
      recentComments: [],
    },
  });
});
