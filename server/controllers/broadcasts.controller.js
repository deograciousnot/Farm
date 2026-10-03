import mongoose from "mongoose";

import { Broadcast } from "../models/broadcast.model.js";
import { BroadcastView } from "../models/broadcast-view.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const ORGANIZATION_FIELDS = "name type logoUrl website";
// Updates leave the Home feed after this long, even if nobody dismisses them.
const HOME_WINDOW_DAYS = 14;

/** Published, unexpired broadcasts. */
function liveFilter() {
  return { status: "published", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
}

/** Broadcasts a member should see: nationwide ones plus those aimed at their county and role. Guests get nationwide only. */
function audienceFilter(user) {
  if (!user) {
    return { counties: { $size: 0 }, roles: { $size: 0 } };
  }

  return {
    $and: [
      { $or: [{ counties: { $size: 0 } }, ...(user.county ? [{ counties: user.county }] : [])] },
      { $or: [{ roles: { $size: 0 } }, { roles: user.role }] },
    ],
  };
}

/**
 * `?scope=home` returns what belongs on the Home feed: recent and not dismissed by this member.
 * Without it, every live update for the member, flagged with whether they've read or dismissed it.
 */
export const listBroadcasts = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
  const forHome = req.query.scope === "home";
  const filters = { ...liveFilter(), ...audienceFilter(req.user) };

  if (forHome) {
    filters.publishedAt = { $gte: new Date(Date.now() - HOME_WINDOW_DAYS * 86_400_000) };
  }

  const receipts = req.user ? await BroadcastView.find({ user: req.user._id }).select("broadcast viewedAt dismissedAt").lean() : [];
  const receiptById = new Map(receipts.map((receipt) => [String(receipt.broadcast), receipt]));

  if (forHome && receipts.length) {
    filters._id = { $nin: receipts.filter((receipt) => receipt.dismissedAt).map((receipt) => receipt.broadcast) };
  }

  const broadcasts = await Broadcast.find(filters)
    .populate("organization", ORGANIZATION_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("-createdBy -publishedBy -anonymousViews")
    .lean();

  const items = broadcasts.map((broadcast) => {
    const receipt = receiptById.get(String(broadcast._id));
    return { ...broadcast, isRead: Boolean(receipt?.viewedAt), isDismissed: Boolean(receipt?.dismissedAt) };
  });

  res.json({ items });
});

/** Hide an update from this member's Home feed. It stays in their Official updates list. */
export const dismissBroadcast = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid broadcast id.", 400);
  }

  if (!(await Broadcast.exists({ _id: req.params.id, status: "published" }))) {
    throw new AppError("This update is no longer available.", 404);
  }

  await BroadcastView.updateOne(
    { broadcast: req.params.id, user: req.user._id },
    { $set: { dismissedAt: new Date() } },
    { upsert: true }
  );

  res.json({ message: "Hidden from Home." });
});

export const getBroadcast = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid broadcast id.", 400);
  }

  const broadcast = await Broadcast.findOne({ _id: req.params.id, status: "published" })
    .populate("organization", `${ORGANIZATION_FIELDS} description`)
    .select("-createdBy -publishedBy -anonymousViews")
    .lean();

  if (!broadcast) {
    throw new AppError("This update is no longer available.", 404);
  }

  // Count each member once; guests are counted in aggregate.
  if (req.user) {
    // Record the first open only. If a row exists with viewedAt already set, the upsert collides
    // with the unique index; that just means they've opened it before.
    await BroadcastView.updateOne(
      { broadcast: broadcast._id, user: req.user._id, viewedAt: null },
      { $set: { viewedAt: new Date() } },
      { upsert: true }
    ).catch((error) => {
      if (error.code !== 11000) throw error;
    });
  } else {
    await Broadcast.updateOne({ _id: broadcast._id }, { $inc: { anonymousViews: 1 } });
  }

  res.json({ item: broadcast });
});
