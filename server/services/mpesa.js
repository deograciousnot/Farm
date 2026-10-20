import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

/**
 * Safaricom Daraja client for Lipa na M-Pesa Online (STK push): the customer gets a PIN prompt on their
 * phone, and Safaricom posts the result to our callback. Without keys outside production, payments are
 * simulated so the flow can be built and tested locally (like SMS codes printing to the console).
 */

const config = env.mpesa;
const BASE_URL = config.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export const mpesaConfigured = Boolean(config.consumerKey && config.consumerSecret);
export const mpesaSimulated = !mpesaConfigured && env.nodeEnv !== "production";

let cachedToken = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    console.error("M-Pesa auth failed", response.status, await response.text().catch(() => ""));
    throw new AppError("M-Pesa is unavailable right now. Please try again shortly.", 502);
  }

  const data = await response.json();
  // Tokens last an hour; refresh a minute early.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return cachedToken.value;
}

/** Daraja wants local Kenyan time as YYYYMMDDHHmmss. */
function timestamp() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function password(time) {
  return Buffer.from(`${config.shortcode}${config.passkey}${time}`).toString("base64");
}

async function post(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export function callbackUrl() {
  return `${config.callbackBaseUrl}/api/payments/mpesa/callback/${config.callbackSecret}`;
}

/**
 * Sends the PIN prompt. `phone` is E.164 (+2547...). Returns Safaricom's request ids, which the callback
 * and status queries refer back to.
 */
export async function requestStkPush({ phone, amount, accountReference, description }) {
  if (!mpesaConfigured) {
    if (!mpesaSimulated) {
      throw new AppError("Payments aren't set up yet. Please try again later.", 503);
    }

    const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[mpesa:simulated] STK push KES ${amount} to ${phone} (${accountReference}). It will succeed in a few seconds.`);
    return { merchantRequestId: id, checkoutRequestId: id, simulated: true };
  }

  if (!config.callbackBaseUrl || !config.callbackSecret) {
    throw new AppError("Payments aren't set up yet: the M-Pesa callback URL is missing.", 503);
  }

  const time = timestamp();
  const { ok, data } = await post("/mpesa/stkpush/v1/processrequest", {
    BusinessShortCode: config.shortcode,
    Password: password(time),
    Timestamp: time,
    TransactionType: config.transactionType,
    Amount: Math.round(amount),
    PartyA: phone.replace(/^\+/, ""),
    PartyB: config.transactionType === "CustomerBuyGoodsOnline" && config.tillNumber ? config.tillNumber : config.shortcode,
    PhoneNumber: phone.replace(/^\+/, ""),
    CallBackURL: callbackUrl(),
    // Shown on the customer's prompt and statement; Daraja caps these at 12 and 13 characters.
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: description.slice(0, 13),
  });

  if (!ok || data.ResponseCode !== "0") {
    console.error("M-Pesa STK push failed", data);
    throw new AppError(data.errorMessage || data.CustomerMessage || "Couldn't send the M-Pesa prompt. Check the number and try again.", 502);
  }

  return { merchantRequestId: data.MerchantRequestID, checkoutRequestId: data.CheckoutRequestID, simulated: false };
}

/**
 * Asks Safaricom how a prompt ended, for when the callback is late or never arrives.
 * Returns { state: "paid" | "failed" | "cancelled" | "pending", resultCode, resultDesc }.
 */
export async function queryStkPush(checkoutRequestId) {
  const time = timestamp();
  const { data } = await post("/mpesa/stkpushquery/v1/query", {
    BusinessShortCode: config.shortcode,
    Password: password(time),
    Timestamp: time,
    CheckoutRequestID: checkoutRequestId,
  });

  // "The transaction is being processed": the customer hasn't answered the prompt yet.
  if (data.errorCode === "500.001.1001" || data.ResultCode === undefined) {
    return { state: "pending" };
  }

  return { ...describeResult(data.ResultCode, data.ResultDesc) };
}

/** Maps a Daraja result code to what happened, in words a farmer understands. */
export function describeResult(code, description = "") {
  const resultCode = String(code);

  if (resultCode === "0") return { state: "paid", resultCode, resultDesc: description };
  if (resultCode === "1032") return { state: "cancelled", resultCode, resultDesc: "You cancelled the M-Pesa prompt." };
  if (resultCode === "1037") return { state: "failed", resultCode, resultDesc: "The M-Pesa prompt timed out. Make sure your phone is on and try again." };
  if (resultCode === "1") return { state: "failed", resultCode, resultDesc: "Your M-Pesa balance isn't enough for this payment." };
  if (resultCode === "2001") return { state: "failed", resultCode, resultDesc: "Wrong M-Pesa PIN. Please try again." };
  return { state: "failed", resultCode, resultDesc: description || "The M-Pesa payment didn't go through." };
}

/** Pulls the useful fields out of Safaricom's callback body. */
export function parseCallback(body) {
  const callback = body?.Body?.stkCallback;

  if (!callback?.CheckoutRequestID) {
    return null;
  }

  const items = Object.fromEntries((callback.CallbackMetadata?.Item ?? []).map((item) => [item.Name, item.Value]));

  return {
    checkoutRequestId: callback.CheckoutRequestID,
    ...describeResult(callback.ResultCode, callback.ResultDesc),
    amount: items.Amount != null ? Number(items.Amount) : null,
    receipt: items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : "",
  };
}
