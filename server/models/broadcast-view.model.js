import mongoose from "mongoose";

/** One row per member who opened a broadcast, so "views" counts people, not page loads. */
const broadcastViewSchema = new mongoose.Schema(
  {
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: "Broadcast", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

broadcastViewSchema.index({ broadcast: 1, user: 1 }, { unique: true });

export const BroadcastView = mongoose.model("BroadcastView", broadcastViewSchema);
