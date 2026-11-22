import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

/**
 * Sends SMS through Africa's Talking. Without credentials (local development), messages are printed
 * to the server console instead, so sign-in can be tested without sending real texts.
 * Production refuses to start a sign-in without a real provider rather than silently not sending.
 */
export function smsIsLive() {
  // Sandbox texts only reach Africa's Talking's simulator, never a real phone, so they don't count in production:
  // members would wait for a code that never comes. Treat it as "not set up" so the app points them to email.
  if (env.nodeEnv === "production" && env.africasTalkingUsername === "sandbox") {
    return false;
  }

  return Boolean(env.africasTalkingUsername && env.africasTalkingApiKey);
}

/**
 * Turns an Africa's Talking failure into a message the member can act on. Only a bad number is the
 * member's to fix; blocked lines and our own setup problems point them to email instead.
 */
function smsFailure(httpStatus, recipientStatus) {
  if (recipientStatus === "UserInBlacklist" || recipientStatus === "DoNotDisturbRejection") {
    return new AppError(
      "Your line blocks promotional texts, so our code can't reach you. On Safaricom, dial *456*9*5# to allow them, or sign in with email instead.",
      422
    );
  }

  if (recipientStatus === "InvalidPhoneNumber") {
    return new AppError("That number can't receive texts. Please check it and try again.", 400);
  }

  if (httpStatus === 401) {
    console.error("Africa's Talking rejected the credentials: check AT_USERNAME and AT_API_KEY are from the same live app.");
  } else if (recipientStatus === "InsufficientBalance") {
    console.error("Africa's Talking balance is empty: top up via Paybill 525900, account = AT_USERNAME.");
  }

  return new AppError("Text messages aren't working right now. Please sign in with email, or try again later.", 503);
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
    throw smsFailure(response.status, recipient?.status);
  }

  return { delivered: true, console: false };
}
