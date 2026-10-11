import { PushToken } from "../models/push-token.model.js";
import { isExpoPushToken } from "../services/push.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const PLATFORMS = ["android", "ios", "web"];

/** Called by the app after the member allows notifications, and on each launch (tokens can change). */
export const registerPushToken = asyncHandler(async (req, res) => {
  const token = String(req.body.token ?? "");

  if (!isExpoPushToken(token)) {
    throw new AppError("That isn't a valid push token.", 400);
  }

  // A phone that changes hands moves to the new member.
  await PushToken.updateOne(
    { token },
    { $set: { user: req.user._id, platform: PLATFORMS.includes(req.body.platform) ? req.body.platform : "unknown" } },
    { upsert: true }
  );

  res.json({ message: "Notifications are on for this phone." });
});

/** Called on sign-out so a shared phone stops getting the previous member's notifications. */
export const removePushToken = asyncHandler(async (req, res) => {
  await PushToken.deleteOne({ token: String(req.body.token ?? ""), user: req.user._id });
  res.json({ message: "Notifications are off for this phone." });
});
