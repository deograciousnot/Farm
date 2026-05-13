import mongoose from "mongoose";

const communityThreadSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    preview: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
    removedReason: {
      type: String,
      default: "",
      trim: true,
    },
    removedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const CommunityThread = mongoose.model("CommunityThread", communityThreadSchema);
