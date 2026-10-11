import mongoose from "mongoose";

import { Broadcast } from "../models/broadcast.model.js";
import { notRemoved } from "../models/moderation-fields.js";
import { Organization } from "../models/organization.model.js";
import { Product } from "../models/product.model.js";
import { withSupplier } from "../services/suppliers.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

/** An organisation's public page: who they are, what FarmConnect checked, their listings and recent updates. */
export const getOrganization = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid organisation id.", 400);
  }

  const organization = await Organization.findById(req.params.id).select("name type description website logoUrl verification members.user").lean();

  if (!organization) {
    throw new AppError("This organisation isn't on FarmConnect.", 404);
  }

  const memberIds = organization.members.map((member) => member.user);
  const [products, updates] = await Promise.all([
    // Only a verified organisation's staff listings are presented as the organisation's own.
    organization.verification?.status === "verified" && memberIds.length
      ? Product.find({ seller: { $in: memberIds }, ...notRemoved })
          .populate("seller", "name verificationStatus location role avatarUrl")
          .sort({ createdAt: -1 })
          .limit(20)
      : [],
    Broadcast.find({ organization: organization._id, status: "published", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] })
      .sort({ publishedAt: -1 })
      .limit(5)
      .select("title body category kind publishedAt")
      .lean(),
  ]);

  const { members: _members, ...publicFields } = organization;
  const verification = organization.verification ?? {};

  res.json({
    item: {
      ...publicFields,
      verification: { status: verification.status ?? "unverified", note: verification.note ?? "", checkedAt: verification.checkedAt ?? null },
      sponsored: organization.type === "company",
    },
    products: (await withSupplier(products)).filter((product) => product.seller),
    updates,
  });
});
