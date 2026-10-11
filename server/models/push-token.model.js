import mongoose from "mongoose";

/** An Expo push token for one of a member's phones. A member can have several (phone + tablet). */
const pushTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["android", "ios", "web", "unknown"], default: "unknown" },
  },
  { timestamps: true }
);

export const PushToken = mongoose.model("PushToken", pushTokenSchema);
