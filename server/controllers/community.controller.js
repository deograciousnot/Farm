import { CommunityThread } from "../models/community-thread.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createNotification } from "../utils/notifications.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";
import { uploadManyToCloudinary } from "../utils/media-upload.js";

export const getCommunityOverview = asyncHandler(async (_req, res) => {
  const topThreads = await CommunityThread.find({ moderationStatus: { $ne: "removed" } })
    .populate("author", "name role location avatarUrl")
    .sort({ isPinned: -1, repliesCount: -1, createdAt: -1 })
    .limit(8);

  const categories = ["Pricing", "Crop care", "Trade trust", "Market Prices", "Farm Inputs"];
  const stats = await Promise.all(
    categories.map(async (category) => ({
    category,
    threads: await CommunityThread.countDocuments({ category, moderationStatus: { $ne: "removed" } }),
    }))
  );

  res.json({
    rooms: ["Dairy Kenya", "Tomato Growers", "Market Prices", "Farm Inputs", "Kitchen Gardeners"],
    stats,
    threads: topThreads,
  });
});

export const getThreadById = asyncHandler(async (req, res) => {
  const thread = await CommunityThread.findOne({ _id: req.params.id, moderationStatus: { $ne: "removed" } }).populate(
    "author",
    "name role location verificationStatus avatarUrl"
  );

  if (!thread) {
    throw new AppError("Community thread not found.", 404);
  }

  thread.viewsCount += 1;
  await thread.save();

  res.json({ item: thread });
});

function normalizeReply(reply) {
  return {
    _id: reply._id,
    body: reply.body,
    createdAt: reply.createdAt,
    author: reply.author,
  };
}

export const getRepliesForThread = asyncHandler(async (req, res) => {
  const thread = await CommunityThread.findOne({ _id: req.params.id, moderationStatus: { $ne: "removed" } });

  if (!thread) {
    throw new AppError("Community thread not found.", 404);
  }

  const replies = await ThreadReply.find({ thread: thread._id })
    .populate("author", "name role location avatarUrl verificationStatus")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    items: replies.map(normalizeReply),
  });
});

export const createThread = asyncHandler(async (req, res) => {
  const { title, body, category } = req.body;

  if (!title || !body || !category) {
    throw new AppError("Title, body, and category are required.", 400);
  }

  const media = await uploadManyToCloudinary(req.files, {
    folder: "farmconnect/community",
  });

  const thread = await CommunityThread.create({
    author: req.user._id,
    title,
    body,
    preview: body.slice(0, 160),
    category,
    media,
  });

  const populatedThread = await CommunityThread.findById(thread._id).populate(
    "author",
    "name role location avatarUrl"
  );

  await recalculateTrustScoreForUser(req.user._id);

  res.status(201).json({
    message: "Community thread created successfully.",
    item: populatedThread,
  });
});

export const createReply = asyncHandler(async (req, res) => {
  const { body } = req.body;
  const thread = await CommunityThread.findOne({ _id: req.params.id, moderationStatus: { $ne: "removed" } }).populate(
    "author",
    "name role location avatarUrl verificationStatus"
  );

  if (!thread) {
    throw new AppError("Community thread not found.", 404);
  }

  if (!body?.trim()) {
    throw new AppError("Reply body is required.", 400);
  }

  const reply = await ThreadReply.create({
    thread: thread._id,
    author: req.user._id,
    body: body.trim(),
  });

  thread.repliesCount += 1;
  await thread.save();

  if (String(thread.author._id) !== String(req.user._id)) {
    await createNotification({
      userId: thread.author._id,
      title: "New reply on your thread",
      body: `${req.user.name} replied to "${thread.title}".`,
      type: "reply",
    });
  }

  const populatedReply = await ThreadReply.findById(reply._id).populate(
    "author",
    "name role location avatarUrl verificationStatus"
  );

  await recalculateTrustScoreForUser(req.user._id);

  res.status(201).json({
    message: "Reply posted successfully.",
    item: normalizeReply(populatedReply),
    repliesCount: thread.repliesCount,
  });
});
