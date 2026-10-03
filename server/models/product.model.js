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

export const Product = mongoose.model("Product", productSchema);
