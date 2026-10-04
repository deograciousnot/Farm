import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

/**
 * Sends SMS through Africa's Talking. Without credentials (local development), messages are printed
 * to the server console instead, so sign-in can be tested without sending real texts.
 * Production refuses to start a sign-in without a real provider rather than silently not sending.
 */
export function smsIsLive() {
  return Boolean(env.africasTalkingUsername && env.africasTalkingApiKey);
}

export async function sendSms(to, message) {
  if (!smsIsLive()) {
    if (env.nodeEnv === "production") {
      throw new AppError("Text messages aren't set up yet. Please sign in with email for now.", 503);
    }
    console.log(`[sms:console] to ${to}: ${message}`);
    return { delivered: false, console: true };
  }

  const host = env.africasTalkingUsername === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  const body = new URLSearchParams({ username: env.africasTalkingUsername, to, message });
  if (env.africasTalkingSenderId) body.set("from", env.africasTalkingSenderId);

  const response = await fetch(`https://${host}/version1/messaging`, {
    method: "POST",
    headers: { apiKey: env.africasTalkingApiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => null);
  const recipient = data?.SMSMessageData?.Recipients?.[0];

  // Africa's Talking returns 2xx even for some per-recipient failures, so check the recipient status too.
  if (!response.ok || !recipient || !["Success", "Sent"].includes(recipient.status)) {
    console.error("SMS send failed", response.status, JSON.stringify(data));
    throw new AppError("We couldn't send the text message. Please check the number and try again.", 502);
  }

  return { delivered: true, console: false };
}
