import mongoose from "mongoose";

const likedPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

likedPostSchema.index({ user: 1, post: 1 }, { unique: true });

export const LikedPost = mongoose.model("LikedPost", likedPostSchema);
