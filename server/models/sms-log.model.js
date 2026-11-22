import mongoose from "mongoose";

/**
 * One row per text we try to send, used only to cap how many go out per hour (see services/sms.js).
 * Deliberately stores no phone number or content. Rows delete themselves after two hours.
 */
const smsLogSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now, expires: 2 * 60 * 60 },
});

export const SmsLog = mongoose.model("SmsLog", smsLogSchema);
