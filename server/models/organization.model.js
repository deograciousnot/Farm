import mongoose from "mongoose";

/** A verified publisher of official broadcasts: a ministry, county department, NGO, research body, etc. */
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Organization = mongoose.model("Organization", organizationSchema);
