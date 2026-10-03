import mongoose from "mongoose";

/** Audit log: one row per admin action, so every take-down or verification is attributable. */
const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment", "thread", "reply", "product", "user", "report", "notification", "order", "analytics", "broadcast", "organization"],
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

adminActionSchema.index({ createdAt: -1 });

export const AdminAction = mongoose.model("AdminAction", adminActionSchema);
