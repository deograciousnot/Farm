import { Notification } from "../models/notification.model.js";
import { sendPushToUsers } from "../services/push.js";

// Likes stay in the in-app list only; a phone buzz for every like is noise.
const IN_APP_ONLY = new Set(["like"]);

export async function createNotification({ userId, title, body, type = "system", link = "" }) {
  if (!userId || !title || !body) {
    return null;
  }

  const notification = await Notification.create({
    user: userId,
    title,
    body,
    type,
    link,
  });

  if (!IN_APP_ONLY.has(type)) {
    // Not awaited: the request shouldn't wait on the push service.
    void sendPushToUsers([userId], { title, body, link });
  }

  return notification;
}
