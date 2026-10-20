import mongoose from "mongoose";

/**
 * One M-Pesa payment attempt. It starts "pending" when the PIN prompt is sent and moves to "paid",
 * "failed" or "cancelled" when Safaricom reports back. What was bought is applied once, on "paid"
 * (fulfilledAt marks that, so a repeated callback never applies it twice).
 */
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: ["listing-boost", "sponsored-credits"], required: true },
    plan: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "KES" },
    phone: { type: String, required: true },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending", index: true },
    merchantRequestId: { type: String, default: "" },
    checkoutRequestId: { type: String, required: true, unique: true },
    receipt: { type: String, default: "" },
    resultCode: { type: String, default: "" },
    resultDesc: { type: String, default: "" },
    simulated: { type: Boolean, default: false },
    lastQueriedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, paidAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
