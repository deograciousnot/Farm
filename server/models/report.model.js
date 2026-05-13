import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["post", "comment", "thread", "reply", "product", "user"],
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 600,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ targetType: 1, target: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
