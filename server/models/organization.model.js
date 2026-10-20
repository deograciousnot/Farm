import mongoose from "mongoose";

/**
 * A publisher of updates: a ministry, county department, NGO, research body, or a company such as an
 * input supplier. Companies' updates are always labelled "Sponsored" (see broadcast.kind).
 */
const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["government", "county", "research", "ngo", "cooperative", "company", "other"],
      default: "other",
    },
    description: { type: String, default: "", trim: true, maxlength: 600 },
    website: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "", trim: true },
    // Staff accounts that can sign in to the partner dashboard to draft updates and see their reach.
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    // What FarmConnect checked before vouching for this organisation, shown on its public page.
    verification: {
      status: { type: String, enum: ["unverified", "verified"], default: "unverified" },
      note: { type: String, default: "", trim: true, maxlength: 200 },
      checkedAt: { type: Date, default: null },
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    // Paid sponsored updates a company has left. Submitting one holds a credit; sending it back returns it.
    sponsoredCredits: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

organizationSchema.index({ "members.user": 1 });

export const Organization = mongoose.model("Organization", organizationSchema);
