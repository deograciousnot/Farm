import { Organization } from "../models/organization.model.js";

/**
 * Tags listings whose seller belongs to a verified organisation, so the app can show
 * "Verified supplier · <name>" and link to the organisation's page. Returns plain objects.
 */
export async function withSupplier(products) {
  const list = products.map((product) => (typeof product.toJSON === "function" ? product.toJSON() : product));
  const sellerIds = [...new Set(list.map((product) => String(product.seller?._id ?? product.seller ?? "")).filter(Boolean))];

  if (!sellerIds.length) return list;

  const organizations = await Organization.find({ "members.user": { $in: sellerIds }, "verification.status": "verified" })
    .select("name logoUrl type members.user")
    .lean();

  const bySeller = new Map();
  for (const organization of organizations) {
    for (const member of organization.members) {
      // A seller in several organisations shows the company first: that's who stands behind the stock.
      const existing = bySeller.get(String(member.user));
      if (!existing || (organization.type === "company" && existing.type !== "company")) {
        bySeller.set(String(member.user), organization);
      }
    }
  }

  return list.map((product) => {
    const organization = bySeller.get(String(product.seller?._id ?? product.seller));
    return organization ? { ...product, supplier: { _id: organization._id, name: organization.name, logoUrl: organization.logoUrl } } : product;
  });
}
