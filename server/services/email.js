import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

/**
 * Sends email through Resend (https://resend.com). Without an API key (local development), messages
 * are printed to the server console instead. Production refuses rather than silently not sending.
 */
export function emailIsLive() {
  return Boolean(env.resendApiKey);
}

export async function sendEmail({ to, subject, text }) {
  if (!emailIsLive()) {
    if (env.nodeEnv === "production") {
      throw new AppError("Email isn't set up yet. Please sign in with your phone number for now.", 503);
    }
    console.log(`[email:console] to ${to}: ${subject}\n${text}`);
    return { delivered: false, console: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text }),
  });

  if (!response.ok) {
    console.error("Email send failed", response.status, await response.text().catch(() => ""));
    throw new AppError("We couldn't send the email. Please check the address and try again.", 502);
  }

  return { delivered: true, console: false };
}

/** The plain-text message for a 6-digit code. */
export function codeEmail(code, action) {
  return {
    subject: `${code} is your FarmConnect code`,
    text: `Your FarmConnect code to ${action} is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email; nobody can get into your account without the code.\n\nFarmConnect`,
  };
}
