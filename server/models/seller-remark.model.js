import mongoose from "mongoose";

const sellerRemarkSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 360,
    },
  },
  {
    timestamps: true,
  }
);

sellerRemarkSchema.index({ seller: 1, createdAt: -1 });
sellerRemarkSchema.index({ buyer: 1, createdAt: -1 });

export const SellerRemark = mongoose.model("SellerRemark", sellerRemarkSchema);
