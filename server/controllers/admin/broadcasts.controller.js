import { Broadcast } from "../../models/broadcast.model.js";
import { BroadcastView } from "../../models/broadcast-view.model.js";
import { Notification } from "../../models/notification.model.js";
import { Organization } from "../../models/organization.model.js";
import { User } from "../../models/user.model.js";
import { logAction } from "../../services/moderation.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { KENYA_COUNTIES } from "../../utils/regions.js";
import { assertObjectId, paginationMeta, parsePagination } from "../../utils/request.js";

const ROLES = ["farmer", "buyer", "hobbyist"];
const NOTIFICATION_BATCH = 1000;

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

export const listOrganizations = asyncHandler(async (_req, res) => {
  const [organizations, counts] = await Promise.all([
    Organization.find().sort({ name: 1 }).lean(),
    Broadcast.aggregate([{ $group: { _id: "$organization", broadcasts: { $sum: 1 }, reach: { $sum: "$reach" } } }]),
  ]);
  const byId = new Map(counts.map((row) => [String(row._id), row]));

  res.json({
    items: organizations.map((organization) => ({
      ...organization,
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
  assertObjectId(req.params.organizationId, "organisation id");
  const organization = await Organization.findById(req.params.organizationId);

  if (!organization) {
    throw new AppError("Organisation not found.", 404);
  }

  Object.assign(organization, organizationInput(req.body));
  await organization.save();
  await logAction(req, { action: "organization.update", targetType: "organization", target: organization._id, summary: organization.name });
  res.json({ message: "Organisation updated.", item: organization });
});

// --- Broadcasts ---------------------------------------------------------------------

function audienceQuery({ counties = [], roles = [] }) {
  return {
    accountStatus: "active",
    ...(counties.length ? { county: { $in: counties } } : {}),
    ...(roles.length ? { role: { $in: roles } } : {}),
  };
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function broadcastInput(body) {
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const counties = parseList(body.counties);
  const roles = parseList(body.roles);

  if (!title || !text) {
    throw new AppError("A broadcast needs a title and a message.", 400);
  }

  const unknownCounties = counties.filter((county) => !KENYA_COUNTIES.includes(county));
  if (unknownCounties.length) {
    throw new AppError(`Unknown counties: ${unknownCounties.join(", ")}`, 400);
  }

  if (roles.some((role) => !ROLES.includes(role))) {
    throw new AppError("Roles must be farmer, buyer, or hobbyist.", 400);
  }

  assertObjectId(body.organization, "organisation");
  if (!(await Organization.exists({ _id: body.organization }))) {
    throw new AppError("Choose an organisation to publish as.", 400);
  }

  const linkUrl = String(body.link?.url ?? "").trim();
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
    throw new AppError("Links must start with http:// or https://", 400);
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new AppError("Invalid expiry date.", 400);
  }

  return {
    organization: body.organization,
    title,
    body: text,
    category: body.category,
    counties: [...new Set(counties)],
    roles: [...new Set(roles)],
    link: { label: String(body.link?.label ?? "").trim() || (linkUrl ? "Learn more" : ""), url: linkUrl },
    expiresAt,
  };
}

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
  const filters = ["draft", "published", "archived"].includes(status) ? { status } : {};

  const [broadcasts, total] = await Promise.all([
    Broadcast.find(filters)
      .populate("organization", "name type logoUrl")
      .populate("publishedBy", "name")
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Broadcast.countDocuments(filters),
  ]);

  const views = await BroadcastView.aggregate([
    { $match: { broadcast: { $in: broadcasts.map((item) => item._id) }, viewedAt: { $ne: null } } },
    { $group: { _id: "$broadcast", count: { $sum: 1 } } },
  ]);
  const viewsById = new Map(views.map((row) => [String(row._id), row.count]));

  const items = broadcasts.map((item) => ({
    ...item,
    views: (viewsById.get(String(item._id)) ?? 0) + (item.anonymousViews ?? 0),
    memberViews: viewsById.get(String(item._id)) ?? 0,
  }));

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

  if (broadcast.status !== "draft") {
    throw new AppError("Only drafts can be edited. Archive this one and send a correction instead.", 400);
  }

  Object.assign(broadcast, await broadcastInput(req.body));
  await broadcast.save();
  res.json({ message: "Draft saved.", item: broadcast });
});

export const publishBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId).populate("organization", "name");

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  if (broadcast.status !== "draft") {
    throw new AppError("This broadcast has already been published.", 400);
  }

  const recipients = await User.find(audienceQuery(broadcast)).select("_id").lean();
  const link = `/broadcast/${broadcast._id}`;
  const title = `${broadcast.organization.name}: ${broadcast.title}`.slice(0, 140);
  const body = broadcast.body.length > 160 ? `${broadcast.body.slice(0, 159)}…` : broadcast.body;

  for (let index = 0; index < recipients.length; index += NOTIFICATION_BATCH) {
    await Notification.insertMany(
      recipients.slice(index, index + NOTIFICATION_BATCH).map((user) => ({ user: user._id, type: "broadcast", title, body, link })),
      { ordered: false }
    );
  }

  broadcast.status = "published";
  broadcast.publishedAt = new Date();
  broadcast.publishedBy = req.user._id;
  broadcast.reach = recipients.length;
  await broadcast.save();

  await logAction(req, {
    action: "broadcast.publish",
    targetType: "broadcast",
    target: broadcast._id,
    summary: `${broadcast.title} · sent to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}`,
  });

  res.json({ message: `Published to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}.`, item: broadcast });
});

export const archiveBroadcast = asyncHandler(async (req, res) => {
  assertObjectId(req.params.broadcastId, "broadcast id");
  const broadcast = await Broadcast.findById(req.params.broadcastId);

  if (!broadcast) {
    throw new AppError("Broadcast not found.", 404);
  }

  broadcast.status = "archived";
  await broadcast.save();
  await logAction(req, { action: "broadcast.archive", targetType: "broadcast", target: broadcast._id, summary: broadcast.title });
  res.json({ message: "Archived. It no longer shows in the app.", item: broadcast });
});
