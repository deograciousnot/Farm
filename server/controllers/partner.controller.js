import { Broadcast } from "../models/broadcast.model.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { SPONSORED_WEEKLY_LIMIT, audienceQuery, broadcastInput, parseList, withViewCounts } from "../services/broadcasts.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { assertObjectId } from "../utils/request.js";

const ORGANIZATION_FIELDS = "name type description website logoUrl verification";

/** Loads the organisation and checks the signed-in member belongs to it. */
async function membership(req, organizationId) {
  assertObjectId(organizationId, "organisation");
  const organization = await Organization.findOne({ _id: organizationId, "members.user": req.user._id }).select(ORGANIZATION_FIELDS).lean();

  if (!organization) {
    throw new AppError("You don't have access to this organisation.", 403);
  }

  return organization;
}

/** Loads one of the member's organisation's updates. */
async function ownBroadcast(req) {
  assertObjectId(req.params.broadcastId, "update id");
  const broadcast = await Broadcast.findById(req.params.broadcastId);

  if (!broadcast) {
    throw new AppError("Update not found.", 404);
  }

  await membership(req, broadcast.organization);
  return broadcast;
}

/** Who is signed in and which organisations they can post for. The dashboard uses this to pick partner mode. */
export const getPartnerProfile = asyncHandler(async (req, res) => {
  const organizations = await Organization.find({ "members.user": req.user._id }).select(ORGANIZATION_FIELDS).sort({ name: 1 }).lean();

  if (!organizations.length) {
    throw new AppError("This account isn't linked to an organisation yet. Ask FarmConnect to add you.", 403);
  }

  const since = new Date(Date.now() - 7 * 86_400_000);
  const sponsoredThisWeek = await Broadcast.aggregate([
    { $match: { organization: { $in: organizations.map((item) => item._id) }, kind: "sponsored", publishedAt: { $gte: since } } },
    { $group: { _id: "$organization", count: { $sum: 1 } } },
  ]);
  const usedById = new Map(sponsoredThisWeek.map((row) => [String(row._id), row.count]));

  res.json({
    partner: { id: req.user._id, name: req.user.name, email: req.user.email, avatarUrl: req.user.avatarUrl },
    organizations: organizations.map((organization) => ({
      ...organization,
      sponsored: organization.type === "company",
      weeklyAllowance: organization.type === "company" ? { limit: SPONSORED_WEEKLY_LIMIT, used: usedById.get(String(organization._id)) ?? 0 } : null,
    })),
  });
});

export const listPartnerBroadcasts = asyncHandler(async (req, res) => {
  const organization = await membership(req, req.query.organization);
  const broadcasts = await Broadcast.find({ organization: organization._id })
    .populate("submittedBy", "name")
    .sort({ updatedAt: -1 })
    .limit(100)
    .select("-createdBy -publishedBy")
    .lean();

  res.json({ items: await withViewCounts(broadcasts) });
});

export const getPartnerAudience = asyncHandler(async (req, res) => {
  await membership(req, req.query.organization);
  const count = await User.countDocuments(audienceQuery({ counties: parseList(req.query.counties), roles: parseList(req.query.roles) }));
  res.json({ count });
});

export const createPartnerBroadcast = asyncHandler(async (req, res) => {
  await membership(req, req.body.organization);
  const broadcast = await Broadcast.create({ ...(await broadcastInput(req.body)), createdBy: req.user._id });
  res.status(201).json({ message: "Draft saved.", item: broadcast });
});

export const updatePartnerBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await ownBroadcast(req);

  if (!["draft", "rejected"].includes(broadcast.status)) {
    throw new AppError(broadcast.status === "pending" ? "This update is waiting for review. Withdraw it to make changes." : "Published updates can't be edited.", 400);
  }

  // Members can't move an update to another organisation they don't belong to.
  const input = await broadcastInput({ ...req.body, organization: broadcast.organization });
  Object.assign(broadcast, input);
  await broadcast.save();
  res.json({ message: "Draft saved.", item: broadcast });
});

/** Sends a draft to FarmConnect for review. Nothing reaches farmers until it's approved. */
export const submitPartnerBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await ownBroadcast(req);

  if (!["draft", "rejected"].includes(broadcast.status)) {
    throw new AppError("Only drafts can be submitted.", 400);
  }

  broadcast.status = "pending";
  broadcast.submittedAt = new Date();
  broadcast.submittedBy = req.user._id;
  await broadcast.save();
  res.json({ message: "Submitted. FarmConnect will review it, usually within a working day.", item: broadcast });
});

/** Takes a submitted update back to draft so it can be changed. */
export const withdrawPartnerBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await ownBroadcast(req);

  if (broadcast.status !== "pending") {
    throw new AppError("Only updates waiting for review can be withdrawn.", 400);
  }

  broadcast.status = "draft";
  await broadcast.save();
  res.json({ message: "Withdrawn. It's a draft again.", item: broadcast });
});

export const deletePartnerBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await ownBroadcast(req);

  if (!["draft", "rejected"].includes(broadcast.status)) {
    throw new AppError("Only drafts can be deleted.", 400);
  }

  await broadcast.deleteOne();
  res.json({ message: "Draft deleted." });
});
