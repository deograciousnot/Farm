import { timingSafeEqual } from "crypto";

import { env } from "../config/env.js";
import { LISTING_BOOSTS, SPONSORED_PACKS } from "../config/pricing.js";
import { notRemoved } from "../models/moderation-fields.js";
import { Organization } from "../models/organization.model.js";
import { Payment } from "../models/payment.model.js";
import { Product } from "../models/product.model.js";
import { mpesaConfigured, mpesaSimulated, parseCallback } from "../services/mpesa.js";
import { refreshPayment, serializePayment, settlePayment, startPayment } from "../services/payments.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { normalizeKenyanPhone } from "../utils/phone.js";
import { assertObjectId } from "../utils/request.js";

function paymentPhone(input) {
  const phone = normalizeKenyanPhone(input);

  if (!phone) {
    throw new AppError("Enter the Safaricom number that should get the M-Pesa prompt, e.g. 0712 345 678.", 400);
  }

  return phone;
}

function isCallbackSecret(value) {
  const expected = Buffer.from(env.mpesa.callbackSecret);
  const given = Buffer.from(String(value ?? ""));
  return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
}

/** Stops someone stacking prompts by tapping Pay repeatedly while one is still on their phone. */
async function assertNoPendingPayment(user) {
  const recent = await Payment.exists({ user: user._id, status: "pending", createdAt: { $gt: new Date(Date.now() - 60_000) } });

  if (recent) {
    throw new AppError("You already have an M-Pesa prompt waiting. Answer it on your phone, or wait a minute and try again.", 409);
  }
}

export const getPlans = asyncHandler(async (_req, res) => {
  res.json({
    available: mpesaConfigured || mpesaSimulated,
    simulated: mpesaSimulated,
    listingBoosts: Object.entries(LISTING_BOOSTS).map(([id, plan]) => ({ id, ...plan })),
    sponsoredPacks: Object.entries(SPONSORED_PACKS).map(([id, plan]) => ({ id, ...plan })),
  });
});

/** A seller pays to boost one of their own listings. */
export const boostListing = asyncHandler(async (req, res) => {
  const { productId, plan: planId } = req.body;
  const plan = LISTING_BOOSTS[planId];
  assertObjectId(productId, "listing id");

  if (!plan) {
    throw new AppError("Choose how long to boost the listing for.", 400);
  }

  const phone = paymentPhone(req.body.phone);
  const product = await Product.findOne({ _id: productId, ...notRemoved });

  if (!product) {
    throw new AppError("Listing not found.", 404);
  }

  if (String(product.seller) !== String(req.user._id)) {
    throw new AppError("You can only boost your own listings.", 403);
  }

  // Paid visibility only for sellers FarmConnect has checked, so a scammer can't buy their way to the top.
  if (!["verified", "top-rated"].includes(req.user.verificationStatus)) {
    throw new AppError("Only verified sellers can boost listings. Ask FarmConnect to verify your account first.", 403);
  }

  if (product.featured && !product.featuredUntil) {
    throw new AppError("FarmConnect is already featuring this listing, so there's no need to boost it.", 400);
  }

  if (product.stock <= 0) {
    throw new AppError("This listing is sold out. Add stock before boosting it.", 400);
  }

  await assertNoPendingPayment(req.user);

  const payment = await startPayment({
    user: req.user,
    purpose: "listing-boost",
    plan: planId,
    amount: plan.amount,
    phone,
    product: product._id,
    reference: "FarmConnect",
    description: "Listing boost",
  });

  res.status(201).json({ message: "Check your phone and enter your M-Pesa PIN.", item: serializePayment(payment) });
});

/** A company's staff buy sponsored-update credits from the partner dashboard. */
export const buySponsoredCredits = asyncHandler(async (req, res) => {
  const { organization: organizationId, plan: planId } = req.body;
  const plan = SPONSORED_PACKS[planId];
  assertObjectId(organizationId, "organisation");

  if (!plan) {
    throw new AppError("Choose a sponsored update pack.", 400);
  }

  const phone = paymentPhone(req.body.phone);
  const organization = await Organization.findOne({ _id: organizationId, "members.user": req.user._id }).select("name type").lean();

  if (!organization) {
    throw new AppError("You don't have access to this organisation.", 403);
  }

  if (organization.type !== "company") {
    throw new AppError("Official updates from public bodies and NGOs are free. Only companies buy sponsored updates.", 400);
  }

  await assertNoPendingPayment(req.user);

  const payment = await startPayment({
    user: req.user,
    purpose: "sponsored-credits",
    plan: planId,
    amount: plan.amount,
    phone,
    organization: organization._id,
    reference: "FarmConnect",
    description: "Sponsored",
  });

  res.status(201).json({ message: "Check your phone and enter your M-Pesa PIN.", item: serializePayment(payment) });
});

/** The app polls this while the customer answers the prompt. */
export const getPayment = asyncHandler(async (req, res) => {
  assertObjectId(req.params.paymentId, "payment id");
  const payment = await Payment.findOne({ _id: req.params.paymentId, user: req.user._id });

  if (!payment) {
    throw new AppError("Payment not found.", 404);
  }

  res.json({ item: serializePayment(await refreshPayment(payment)) });
});

/**
 * Safaricom posts every prompt's result here. The secret in the path keeps others from faking one.
 * Always answer "accepted", or Safaricom keeps retrying.
 */
export const mpesaCallback = asyncHandler(async (req, res) => {
  if (!isCallbackSecret(req.params.secret)) {
    res.status(404).json({ message: "Not found." });
    return;
  }

  const result = parseCallback(req.body);

  if (result) {
    await settlePayment(result.checkoutRequestId, result);
  } else {
    console.error("Unreadable M-Pesa callback", JSON.stringify(req.body).slice(0, 500));
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});
