import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postType: {
      type: String,
      enum: ["knowledge", "product", "market", "sponsored"],
      default: "knowledge",
    },
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    linkedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    isSponsored: {
      type: Boolean,
      default: false,
    },
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        thumbnailUrl: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Post = mongoose.model("Post", postSchema);
