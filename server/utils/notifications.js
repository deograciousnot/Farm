import { Notification } from "../models/notification.model.js";

export async function createNotification({ userId, title, body, type = "system", link = "" }) {
  if (!userId || !title || !body) {
    return null;
  }

  return Notification.create({
    user: userId,
    title,
    body,
    type,
    link,
  });
}
