import mongoose from "mongoose";

/**
 * A message from an organisation, targeted by county and role.
 * "official" updates (government, NGOs, research) notify every matching member and lead the Home feed.
 * "sponsored" updates come from companies: labelled as such, never pushed, and shown after official ones.
 */
const broadcastSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    kind: { type: String, enum: ["official", "sponsored"], default: "official" },
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
    // Partners write drafts and submit them ("pending"); FarmConnect publishes or rejects them.
    status: { type: String, enum: ["draft", "pending", "rejected", "published", "archived"], default: "draft", index: true },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, default: "", trim: true, maxlength: 500 },
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
