import { Broadcast } from "../../models/broadcast.model.js";
import { Notification } from "../../models/notification.model.js";
import { Organization } from "../../models/organization.model.js";
import { User } from "../../models/user.model.js";
import {
  assertSponsoredAllowance,
  audienceQuery,
  broadcastInput,
  kindForOrganization,
  parseList,
  releaseSponsoredCredit,
  withViewCounts,
} from "../../services/broadcasts.js";
import { sendEmail } from "../../services/email.js";
import { logAction } from "../../services/moderation.js";
import { sendPushToUsers } from "../../services/push.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createNotification } from "../../utils/notifications.js";
import { assertObjectId, paginationMeta, parsePagination } from "../../utils/request.js";

const NOTIFICATION_BATCH = 1000;
const MEMBER_FIELDS = "name email avatarUrl";

// --- Organizations ------------------------------------------------------------------

function organizationInput(body) {
  const name = String(body.name ?? "").trim();

  if (!name) {
    throw new AppError("The organisation needs a name.", 400);
  }

  const website = String(body.website ?? "").trim();
  if (website && !/^https?:\/\//i.test(website)) {
    throw new AppError("Website must start with http:// or https://", 400);
  }

  return {
    name,
    type: body.type,
    description: String(body.description ?? "").trim(),
    website,
    logoUrl: String(body.logoUrl ?? "").trim(),
  };
}

async function findOrganization(id) {
  assertObjectId(id, "organisation id");
  const organization = await Organization.findById(id);

  if (!organization) {
    throw new AppError("Organisation not found.", 404);
  }

  return organization;
}

const populatedOrganization = (id) => Organization.findById(id).populate("members.user", MEMBER_FIELDS).lean();

export const listOrganizations = asyncHandler(async (_req, res) => {
  const [organizations, counts] = await Promise.all([
    Organization.find().populate("members.user", MEMBER_FIELDS).sort({ name: 1 }).lean(),
    Broadcast.aggregate([{ $group: { _id: "$organization", broadcasts: { $sum: 1 }, reach: { $sum: "$reach" } } }]),
  ]);
  const byId = new Map(counts.map((row) => [String(row._id), row]));

  res.json({
    items: organizations.map((organization) => ({
      ...organization,
      // A deleted account leaves a null member behind; hide it.
      members: (organization.members ?? []).filter((member) => member.user),
      broadcasts: byId.get(String(organization._id))?.broadcasts ?? 0,
      reach: byId.get(String(organization._id))?.reach ?? 0,
    })),
  });
});

export const createOrganization = asyncHandler(async (req, res) => {
  const input = organizationInput(req.body);

  if (await Organization.exists({ name: new RegExp(`^${input.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) {
    throw new AppError("An organisation with that name already exists.", 409);
  }

  const organization = await Organization.create({ ...input, createdBy: req.user._id });
  await logAction(req, { action: "organization.create", targetType: "organization", target: organization._id, summary: organization.name });
  res.status(201).json({ message: "Organisation added.", item: organization });
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const organization = await findOrganization(req.params.organizationId);

  Object.assign(organization, organizationInput(req.body));
  await organization.save();
  await logAction(req, { action: "organization.update", targetType: "organization", target: organization._id, summary: organization.name });
  res.json({ message: "Organisation updated.", item: await populatedOrganization(organization._id) });
});

/** Records what FarmConnect checked (e.g. "Business registration and fertiliser dealer licence"). */
export const setOrganizationVerification = asyncHandler(async (req, res) => {
  const organization = await findOrganization(req.params.organizationId);
  const status = req.body.status === "verified" ? "verified" : "unverified";
  const note = String(req.body.note ?? "").trim();

  if (status === "verified" && !note) {
    throw new AppError("Say what you checked, for example \"Business registration and dealer licence\".", 400);
  }

  organization.verification = status === "verified" ? { status, note, checkedAt: new Date(), checkedBy: req.user._id } : { status, note: "", checkedAt: null };
  await organization.save();
  await logAction(req, {
    action: status === "verified" ? "organization.verify" : "organization.unverify",
    targetType: "organization",
    target: organization._id,
    summary: status === "verified" ? `${organization.name}: ${note}` : organization.name,
  });

  res.json({ message: status === "verified" ? "Marked as verified." : "Verification removed.", item: await populatedOrganization(organization._id) });
});

/** Gives a FarmConnect account access to this organisation's partner dashboard. */
export const addOrganizationMember = asyncHandler(async (req, res) => {
  const organization = await findOrganization(req.params.organizationId);
  const email = String(req.body.email ?? "").toLowerCase().trim();
  const user = await User.findOne({ email, accountStatus: "active" }).select("name email");

  if (!user) {
    throw new AppError("No FarmConnect account uses that email. Ask them to sign up in the app first, then add them.", 404);
  }

  if (organization.members.some((member) => String(member.user) === String(user._id))) {
    throw new AppError(`${user.name} is already a member.`, 409);
  }

  organization.members.push({ user: user._id });
  await organization.save();
  await logAction(req, { action: "organization.member.add", targetType: "organization", target: organization._id, summary: `${user.name} added to ${organization.name}` });
  await createNotification({
    userId: user._id,
    type: "system",
    title: `You can now post for ${organization.name}`,
    body: "Sign in to the FarmConnect partner dashboard with this account to write updates and see how many farmers they reach.",
  });

  res.json({ message: `${user.name} can now sign in to the partner dashboard.`, item: await populatedOrganization(organization._id) });
});

export const removeOrganizationMember = asyncHandler(async (req, res) => {
  const organization = await findOrganization(req.params.organizationId);
  assertObjectId(req.params.userId, "member id");

  organization.members = organization.members.filter((member) => String(member.user) !== req.params.userId);
  await organization.save();
  await logAction(req, { action: "organization.member.remove", targetType: "organization", target: organization._id, summary: organization.name });
  res.json({ message: "Access removed.", item: await populatedOrganization(organization._id) });
});

// --- Broadcasts ---------------------------------------------------------------------

export const getAudience = asyncHandler(async (req, res) => {
  const counties = parseList(req.query.counties);
  const roles = parseList(req.query.roles);
  const [count, byRole] = await Promise.all([
    User.countDocuments(audienceQuery({ counties, roles })),
    User.aggregate([{ $match: audienceQuery({ counties, roles }) }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
  ]);

  res.json({ count, byRole: Object.fromEntries(byRole.map((row) => [row._id, row.count])) });
});

export const listBroadcasts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req);
  const status = req.query.status;
  const filters = ["draft", "pending", "rejected", "published", "archived"].includes(status) ? { status } : {};

  const [broadcasts, total] = await Promise.all([
    Broadcast.find(filters)
      .populate("organization", "name type logoUrl")
      .populate("publishedBy", "name")
      .populate("submittedBy", "name email")
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Broadcast.countDocuments(filters),
  ]);

  const items = await withViewCounts(broadcasts);
  res.json({ items, pagination: paginationMeta(pagination, items.length, total) });
});

export const createBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await Broadcast.create({ ...(await broadcastInput(req.body)), createdBy: req.user._id });
  await logAction(req, { action: "broadcast.draft", targetType: "broadcast", target: broadcast._id, summary: broadcast.title });
  res.status(201).json({ message: "Draft saved.", item: broadcast });
});

export const updateBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId);

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  // Submitted updates can be tidied up before publishing; published ones are corrected with a new update.
  if (!["draft", "pending", "rejected"].includes(broadcast.status)) {
    throw new AppError("Only unpublished updates can be edited. Archive this one and send a correction instead.", 400);
  }

  Object.assign(broadcast, await broadcastInput(req.body));
  await broadcast.save();
  res.json({ message: "Saved.", item: broadcast });
});

export const publishBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId).populate("organization", "name type");

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  if (!["draft", "pending"].includes(broadcast.status)) {
    throw new AppError("This update has already been published or rejected.", 400);
  }

  // Recompute in case the organisation's type changed since the draft was written.
  broadcast.kind = kindForOrganization(broadcast.organization);
  if (broadcast.kind === "sponsored") {
    await assertSponsoredAllowance(broadcast.organization._id);
  }

  const recipients = await User.find(audienceQuery(broadcast)).select("_id").lean();
  const link = `/broadcast/${broadcast._id}`;

  // Official updates notify everyone in the audience. Sponsored ones only appear in the feed:
  // a company's message never interrupts a farmer.
  if (broadcast.kind === "official") {
    const title = `${broadcast.organization.name}: ${broadcast.title}`.slice(0, 140);
    const body = broadcast.body.length > 160 ? `${broadcast.body.slice(0, 159)}…` : broadcast.body;

    for (let index = 0; index < recipients.length; index += NOTIFICATION_BATCH) {
      await Notification.insertMany(
        recipients.slice(index, index + NOTIFICATION_BATCH).map((user) => ({ user: user._id, type: "broadcast", title, body, link })),
        { ordered: false }
      );
    }

    // High-priority "Official alerts" channel on Android.
    void sendPushToUsers(
      recipients.map((user) => user._id),
      { title, body, link, channelId: "alerts" }
    );
  }

  // The held credit is now spent.
  broadcast.creditHeld = false;
  broadcast.status = "published";
  broadcast.publishedAt = new Date();
  broadcast.publishedBy = req.user._id;
  broadcast.reach = recipients.length;
  broadcast.reviewNote = "";
  await broadcast.save();

  if (broadcast.submittedBy) {
    await createNotification({
      userId: broadcast.submittedBy,
      type: "system",
      title: "Your update is live",
      body: `"${broadcast.title}" is now showing to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}.`,
      link,
    });
  }

  await logAction(req, {
    action: "broadcast.publish",
    targetType: "broadcast",
    target: broadcast._id,
    summary: `${broadcast.title} · ${broadcast.kind} · ${recipients.length} ${recipients.length === 1 ? "person" : "people"}`,
  });

  res.json({ message: `Published to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}.`, item: broadcast });
});

/** Sends a partner's submitted update back with a reason they can act on. */
export const rejectBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId).populate("submittedBy", "email name");
  const reason = String(req.body.reason ?? "").trim();

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  if (broadcast.status !== "pending") {
    throw new AppError("Only submitted updates can be sent back.", 400);
  }

  if (!reason) {
    throw new AppError("Tell them what to change so they can fix it.", 400);
  }

  await releaseSponsoredCredit(broadcast);
  broadcast.status = "rejected";
  broadcast.reviewNote = reason.slice(0, 500);
  await broadcast.save();

  const submitter = broadcast.submittedBy;
  if (submitter?._id) {
    await createNotification({
      userId: submitter._id,
      type: "system",
      title: "Your update needs changes",
      body: `"${broadcast.title}": ${broadcast.reviewNote}`,
    });

    if (submitter.email) {
      sendEmail({
        to: submitter.email,
        subject: `Changes needed: ${broadcast.title}`,
        text: `Hi ${submitter.name},\n\nYour FarmConnect update "${broadcast.title}" wasn't published yet. Here's what to change:\n\n${broadcast.reviewNote}\n\nEdit it in the partner dashboard and submit it again.\n\nFarmConnect`,
      }).catch((error) => console.error("Couldn't email the review note", error.message));
    }
  }

  await logAction(req, { action: "broadcast.reject", targetType: "broadcast", target: broadcast._id, summary: `${broadcast.title}: ${broadcast.reviewNote}` });
  res.json({ message: "Sent back with your note.", item: broadcast });
});

export const archiveBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId);

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  await releaseSponsoredCredit(broadcast);
  broadcast.status = "archived";
  await broadcast.save();
  await logAction(req, { action: "broadcast.archive", targetType: "broadcast", target: broadcast._id, summary: broadcast.title });
  res.json({ message: "Archived. It no longer shows in the app.", item: broadcast });
});
