import mongoose from "mongoose";

/**
 * A one-time code sent by SMS or email (phone sign-in, email confirmation, password reset).
 * Only a hash is stored; MongoDB deletes rows once they expire.
 */
const otpCodeSchema = new mongoose.Schema(
  {
    // The phone number or email address the code was sent to.
    target: { type: String, required: true },
    purpose: { type: String, enum: ["phone-sign-in", "verify-email", "reset-password"], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpCodeSchema.index({ target: 1, purpose: 1 });
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = mongoose.model("OtpCode", otpCodeSchema);
