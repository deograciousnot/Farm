import mongoose from "mongoose";

/**
 * One row per member per broadcast: when they first opened it and whether they dismissed it from Home.
 * "Views" count people, not page loads.
 */
const broadcastViewSchema = new mongoose.Schema(
  {
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: "Broadcast", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

broadcastViewSchema.index({ broadcast: 1, user: 1 }, { unique: true });
broadcastViewSchema.index({ user: 1, dismissedAt: 1 });

export const BroadcastView = mongoose.model("BroadcastView", broadcastViewSchema);
