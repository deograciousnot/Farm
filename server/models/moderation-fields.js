/** Shared schema fields for content admins can take down. Missing values count as active. */
export const moderationFields = {
  moderationStatus: {
    type: String,
    enum: ["active", "removed"],
    default: "active",
  },
  removedReason: {
    type: String,
    default: "",
    trim: true,
  },
  removedAt: {
    type: Date,
    default: null,
  },
};

/** Query filter for publicly visible content (documents created before moderation have no status). */
export const notRemoved = { moderationStatus: { $ne: "removed" } };
