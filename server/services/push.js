import { PushToken } from "../models/push-token.model.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
const CHUNK = 100;

export function isExpoPushToken(token) {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(String(token ?? ""));
}

/**
 * Sends a push notification to every registered phone of these members through Expo's push service.
 * Never throws: a failed push must not fail the request that triggered it (the in-app notification
 * is already saved). Tokens Expo reports as uninstalled are removed.
 *
 * channelId matches the Android channels the app creates: "default" (activity) or "alerts" (official).
 */
export async function sendPushToUsers(userIds, { title, body, link = "", channelId = "default" }) {
  try {
    const ids = [...new Set(userIds.map(String))];
    if (!ids.length) return;

    const tokens = await PushToken.find({ user: { $in: ids } }).select("token").lean();
    if (!tokens.length) return;

    for (let index = 0; index < tokens.length; index += CHUNK) {
      const batch = tokens.slice(index, index + CHUNK);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(
          batch.map(({ token }) => ({ to: token, title, body, data: { link }, sound: "default", channelId, priority: channelId === "alerts" ? "high" : "default" }))
        ),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !Array.isArray(result?.data)) {
        console.error("Push send failed", response.status, JSON.stringify(result)?.slice(0, 500));
        continue;
      }

      // Tickets come back in the same order as the messages.
      const gone = result.data
        .map((ticket, position) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? batch[position].token : null))
        .filter(Boolean);
      if (gone.length) await PushToken.deleteMany({ token: { $in: gone } });
    }
  } catch (error) {
    console.error("Push send failed", error.message);
  }
}
