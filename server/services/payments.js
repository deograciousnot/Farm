import { LISTING_BOOSTS, SPONSORED_PACKS } from "../config/pricing.js";
import { Organization } from "../models/organization.model.js";
import { Payment } from "../models/payment.model.js";
import { Product } from "../models/product.model.js";
import { createNotification } from "../utils/notifications.js";
import { formatKes } from "../utils/money.js";

import { mpesaConfigured, queryStkPush, requestStkPush } from "./mpesa.js";

const DAY = 86_400_000;
// The phone prompt itself expires after about a minute; give Safaricom's callback time to arrive after that.
const PENDING_TIMEOUT_MS = 3 * 60_000;
const QUERY_AFTER_MS = 20_000;
const QUERY_EVERY_MS = 10_000;
const SIMULATED_DELAY_MS = 4_000;

/** Listings that are featured right now: admin picks (no end date) and boosts that haven't run out. */
export function activeFeaturedFilter(now = new Date()) {
  return { featured: true, $or: [{ featuredUntil: null }, { featuredUntil: { $gt: now } }] };
}

/** Turns off boosts whose time is up, so they stop sorting to the top of the market. */
export async function expireBoosts() {
  const result = await Product.updateMany({ featured: true, featuredUntil: { $ne: null, $lte: new Date() } }, { featured: false, featuredUntil: null });
  return result.modifiedCount;
}

/** Sends the M-Pesa prompt and records the attempt. */
export async function startPayment({ user, purpose, plan, amount, phone, product, organization, reference, description }) {
  const push = await requestStkPush({ phone, amount, accountReference: reference, description });
  const payment = await Payment.create({
    user: user._id,
    purpose,
    plan,
    amount,
    phone,
    product,
    organization,
    merchantRequestId: push.merchantRequestId,
    checkoutRequestId: push.checkoutRequestId,
    simulated: push.simulated,
  });

  if (push.simulated) {
    setTimeout(() => {
      settlePayment(payment.checkoutRequestId, { state: "paid", resultCode: "0", resultDesc: "Simulated payment", receipt: `SIM${Date.now().toString(36).toUpperCase()}` }).catch(
        (error) => console.error("Simulated payment failed", error)
      );
    }, SIMULATED_DELAY_MS);
  }

  return payment;
}

/**
 * Records how a prompt ended. Safe to call more than once for the same payment (Safaricom retries
 * callbacks, and status checks can race them): only the first result counts.
 */
export async function settlePayment(checkoutRequestId, { state, resultCode = "", resultDesc = "", receipt = "", amount = null }) {
  if (state === "pending") {
    return Payment.findOne({ checkoutRequestId });
  }

  const existing = await Payment.findOne({ checkoutRequestId });
  if (!existing) {
    return null;
  }

  let status = state;
  let description = resultDesc;

  // The prompt carries our amount, so a mismatch means something is wrong: don't hand anything out.
  if (state === "paid" && amount != null && Math.round(amount) !== existing.amount) {
    console.error(`M-Pesa amount mismatch on ${checkoutRequestId}: expected ${existing.amount}, got ${amount}`);
    status = "failed";
    description = `Amount mismatch: received KES ${amount}. Contact support with receipt ${receipt}.`;
  }

  const payment = await Payment.findOneAndUpdate(
    { _id: existing._id, status: "pending" },
    { status, resultCode, resultDesc: description, receipt, ...(status === "paid" ? { paidAt: new Date() } : {}) },
    { returnDocument: "after" }
  );

  if (!payment) {
    // A status query settled it first; the callback still brings the receipt number.
    if (receipt && existing.status === "paid" && !existing.receipt) {
      existing.receipt = receipt;
      await existing.save();
    }
    return existing;
  }

  if (payment.status === "paid") {
    await fulfilPayment(payment);
  }

  return payment;
}

function receiptNote(payment) {
  return payment.receipt ? ` M-Pesa receipt ${payment.receipt}.` : "";
}

/** Applies what was bought, exactly once. */
async function fulfilPayment(payment) {
  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: "paid", fulfilledAt: null }, { fulfilledAt: new Date() }, { returnDocument: "after" });

  if (!claimed) {
    return;
  }

  if (payment.purpose === "listing-boost") {
    const boost = LISTING_BOOSTS[payment.plan];
    const product = await Product.findById(payment.product);

    if (!boost || !product) {
      console.error(`Paid boost ${payment._id} has no plan or listing to apply to`);
      return;
    }

    // Boosting again before the last one runs out adds the days on to the end.
    const now = Date.now();
    const start = product.featured && product.featuredUntil && product.featuredUntil.getTime() > now ? product.featuredUntil.getTime() : now;
    product.featured = true;
    product.featuredUntil = new Date(start + boost.days * DAY);
    await product.save();

    await createNotification({
      userId: payment.user,
      title: "Your listing is boosted",
      body: `"${product.name}" is now at the top of the market until ${product.featuredUntil.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}.${receiptNote(payment)}`,
      link: `/product/${product._id}`,
    });
    return;
  }

  if (payment.purpose === "sponsored-credits") {
    const pack = SPONSORED_PACKS[payment.plan];
    const organization = await Organization.findByIdAndUpdate(payment.organization, { $inc: { sponsoredCredits: pack?.credits ?? 0 } }, { returnDocument: "after" });

    if (!pack || !organization) {
      console.error(`Paid sponsored pack ${payment._id} has no plan or organisation to apply to`);
      return;
    }

    await createNotification({
      userId: payment.user,
      title: "Sponsored credits added",
      body: `${formatKes(payment.amount)} received for ${organization.name}. You have ${organization.sponsoredCredits} sponsored ${organization.sponsoredCredits === 1 ? "update" : "updates"} to use.${receiptNote(payment)}`,
    });
  }
}

/**
 * Brings a pending payment up to date when the app asks, in case Safaricom's callback is slow or lost.
 * Asks Daraja at most every few seconds, and gives up on prompts nobody answered.
 */
export async function refreshPayment(payment) {
  if (payment.status !== "pending" || payment.simulated) {
    return payment;
  }

  const age = Date.now() - payment.createdAt.getTime();
  const sinceQuery = payment.lastQueriedAt ? Date.now() - payment.lastQueriedAt.getTime() : Infinity;

  if (mpesaConfigured && age > QUERY_AFTER_MS && sinceQuery > QUERY_EVERY_MS) {
    payment.lastQueriedAt = new Date();
    await Payment.updateOne({ _id: payment._id }, { lastQueriedAt: payment.lastQueriedAt });

    try {
      const result = await queryStkPush(payment.checkoutRequestId);
      if (result.state !== "pending") {
        // The query doesn't return a receipt; a later callback can't change the status, so take it from there if one comes.
        return (await settlePayment(payment.checkoutRequestId, result)) ?? payment;
      }
    } catch (error) {
      console.error("M-Pesa status query failed", error.message);
    }
  }

  if (age > PENDING_TIMEOUT_MS) {
    return (
      (await settlePayment(payment.checkoutRequestId, {
        state: "failed",
        resultCode: "timeout",
        resultDesc: "We didn't hear back from M-Pesa. If money left your account, contact support with the M-Pesa message.",
      })) ?? payment
    );
  }

  return payment;
}

/** What the app shows while it waits on a payment. */
export function serializePayment(payment) {
  return {
    _id: payment._id,
    purpose: payment.purpose,
    plan: payment.plan,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    receipt: payment.receipt,
    message: payment.resultDesc,
    simulated: payment.simulated,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
  };
}
