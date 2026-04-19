import mongoose from "mongoose";

import { Comment } from "../models/comment.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { Post } from "../models/post.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createNotification } from "../utils/notifications.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

function normalizeComment(comment) {
  return {
    _id: comment._id,
    body: comment.body,
    createdAt: comment.createdAt,
    author: comment.author,
  };
}

export const getCommentsForPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  const comments = await Comment.find({ post: postId })
    .populate("author", "name role location avatarUrl verificationStatus")
    .sort({ createdAt: -1 })
    .limit(30);

  res.json({
    items: comments.map(normalizeComment),
  });
});

export const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { body } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  if (!body?.trim()) {
    throw new AppError("Comment body is required.", 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    body: body.trim(),
  });

  post.commentsCount += 1;
  await post.save();

  if (String(post.author) !== String(req.user._id)) {
    await createNotification({
      userId: post.author,
      title: "New comment on your post",
      body: `${req.user.name} replied to "${post.headline}".`,
      type: "comment",
    });
  }

  const populatedComment = await Comment.findById(comment._id).populate(
    "author",
    "name role location avatarUrl verificationStatus"
  );

  await recalculateTrustScoreForUser(req.user._id);

  res.status(201).json({
    message: "Comment posted successfully.",
    item: normalizeComment(populatedComment),
    commentsCount: post.commentsCount,
  });
});

export const toggleSavedPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  const existingSave = await SavedPost.findOne({
    user: req.user._id,
    post: post._id,
  });

  let saved = false;

  if (existingSave) {
    await existingSave.deleteOne();
    post.savesCount = Math.max(0, post.savesCount - 1);
  } else {
    await SavedPost.create({
      user: req.user._id,
      post: post._id,
    });
    post.savesCount += 1;
    saved = true;
  }

  await post.save();

  res.json({
    saved,
    savesCount: post.savesCount,
  });
});

export const toggleLikedPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError("Invalid post id.", 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  const existingLike = await LikedPost.findOne({
    user: req.user._id,
    post: post._id,
  });

  let liked = false;

  if (existingLike) {
    await existingLike.deleteOne();
    post.likesCount = Math.max(0, post.likesCount - 1);
  } else {
    await LikedPost.create({
      user: req.user._id,
      post: post._id,
    });
    post.likesCount += 1;
    liked = true;

    if (String(post.author) !== String(req.user._id)) {
      await createNotification({
        userId: post.author,
        title: "Your post got a new like",
        body: `${req.user.name} liked "${post.headline}".`,
        type: "like",
      });
    }
  }

  await post.save();

  res.json({
    liked,
    likesCount: post.likesCount,
  });
});
