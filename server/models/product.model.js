import mongoose from "mongoose";

import { countyPlugin } from "../utils/regions.js";

import { moderationFields } from "./moderation-fields.js";

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    sellerType: {
      type: String,
      enum: ["farmer", "input-company"],
      default: "farmer",
    },
    isOrganic: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    // Set when the seller paid to boost the listing; null when an admin featured it (no end date).
    featuredUntil: {
      type: Date,
      default: null,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    ...moderationFields,
  },
  {
    timestamps: true,
  }
);

productSchema.plugin(countyPlugin);
productSchema.index({ featured: 1, featuredUntil: 1 });

export const Product = mongoose.model("Product", productSchema);
