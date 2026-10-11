import { Broadcast } from "../models/broadcast.model.js";
import { BroadcastView } from "../models/broadcast-view.model.js";
import { Organization } from "../models/organization.model.js";
import { AppError } from "../utils/app-error.js";
import { KENYA_COUNTIES } from "../utils/regions.js";
import { assertObjectId } from "../utils/request.js";

const ROLES = ["farmer", "buyer", "hobbyist"];
// Companies may publish this many sponsored updates per rolling week, so the feed stays useful.
export const SPONSORED_WEEKLY_LIMIT = 2;

/** Companies' updates are always sponsored; public bodies' are official. */
export function kindForOrganization(organization) {
  return organization?.type === "company" ? "sponsored" : "official";
}

export function audienceQuery({ counties = [], roles = [] }) {
  return {
    accountStatus: "active",
    ...(counties.length ? { county: { $in: counties } } : {}),
    ...(roles.length ? { role: { $in: roles } } : {}),
  };
}

export function parseList(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Validates an update's fields. Returns them plus the organisation it will be published as. */
export async function broadcastInput(body) {
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const counties = parseList(body.counties);
  const roles = parseList(body.roles);

  if (!title || !text) {
    throw new AppError("An update needs a title and a message.", 400);
  }

  const unknownCounties = counties.filter((county) => !KENYA_COUNTIES.includes(county));
  if (unknownCounties.length) {
    throw new AppError(`Unknown counties: ${unknownCounties.join(", ")}`, 400);
  }

  if (roles.some((role) => !ROLES.includes(role))) {
    throw new AppError("Roles must be farmer, buyer, or hobbyist.", 400);
  }

  assertObjectId(body.organization, "organisation");
  const organization = await Organization.findById(body.organization).select("type").lean();
  if (!organization) {
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
    kind: kindForOrganization(organization),
    title,
    body: text,
    category: body.category,
    counties: [...new Set(counties)],
    roles: [...new Set(roles)],
    link: { label: String(body.link?.label ?? "").trim() || (linkUrl ? "Learn more" : ""), url: linkUrl },
    expiresAt,
  };
}

/** Throws if publishing one more sponsored update would exceed the organisation's weekly allowance. */
export async function assertSponsoredAllowance(organizationId) {
  const published = await Broadcast.countDocuments({
    organization: organizationId,
    kind: "sponsored",
    status: { $in: ["published", "archived"] },
    publishedAt: { $gte: new Date(Date.now() - 7 * 86_400_000) },
  });

  if (published >= SPONSORED_WEEKLY_LIMIT) {
    throw new AppError(`This company has already published ${SPONSORED_WEEKLY_LIMIT} sponsored updates this week. Try again in a few days.`, 429);
  }
}

/** Adds how many people opened each update (members once each, plus guests). */
export async function withViewCounts(broadcasts) {
  const views = await BroadcastView.aggregate([
    { $match: { broadcast: { $in: broadcasts.map((item) => item._id) }, viewedAt: { $ne: null } } },
    { $group: { _id: "$broadcast", count: { $sum: 1 } } },
  ]);
  const viewsById = new Map(views.map((row) => [String(row._id), row.count]));

  return broadcasts.map((item) => ({
    ...item,
    views: (viewsById.get(String(item._id)) ?? 0) + (item.anonymousViews ?? 0),
    memberViews: viewsById.get(String(item._id)) ?? 0,
  }));
}
