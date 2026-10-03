import mongoose from "mongoose";

import { Broadcast } from "../models/broadcast.model.js";
import { BroadcastView } from "../models/broadcast-view.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const ORGANIZATION_FIELDS = "name type logoUrl website";

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

export const listBroadcasts = asyncHandler(async (req, res) => {
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));
  const items = await Broadcast.find({ ...liveFilter(), ...audienceFilter(req.user) })
    .populate("organization", ORGANIZATION_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("-createdBy -publishedBy -anonymousViews")
    .lean();

  res.json({ items });
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
    await BroadcastView.updateOne({ broadcast: broadcast._id, user: req.user._id }, { $setOnInsert: { broadcast: broadcast._id, user: req.user._id } }, { upsert: true });
  } else {
    await Broadcast.updateOne({ _id: broadcast._id }, { $inc: { anonymousViews: 1 } });
  }

  res.json({ item: broadcast });
});
