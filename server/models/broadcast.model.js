import mongoose from "mongoose";

/**
 * An official message from a verified organisation, targeted by county and role.
 * Publishing sends a notification to every matching member and shows it at the top of their feed.
 */
const broadcastSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    category: {
      type: String,
      enum: ["advisory", "pest-alert", "weather", "market", "program", "training"],
      default: "advisory",
    },
    // Empty means everyone (all counties / all roles).
    counties: { type: [String], default: [] },
    roles: { type: [String], enum: ["farmer", "buyer", "hobbyist"], default: [] },
    link: {
      label: { type: String, default: "", trim: true },
      url: { type: String, default: "", trim: true },
    },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reach: { type: Number, default: 0 },
    anonymousViews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

broadcastSchema.index({ status: 1, publishedAt: -1 });

export const Broadcast = mongoose.model("Broadcast", broadcastSchema);
