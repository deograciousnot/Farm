import mongoose from "mongoose";

import { moderationFields } from "./moderation-fields.js";

const threadReplySchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityThread",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    ...moderationFields,
  },
  {
    timestamps: true,
  }
);

export const ThreadReply = mongoose.model("ThreadReply", threadReplySchema);
