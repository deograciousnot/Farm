import mongoose from "mongoose";

import { AppError } from "./app-error.js";

/** Helpers shared by list endpoints: paging, safe regex search, and id validation. */

export function parsePagination(req, defaultLimit = 20) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || defaultLimit));

  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta({ page, limit, skip }, itemsLength, total) {
  return { page, limit, total, hasMore: skip + itemsLength < total };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertObjectId(id, label = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label}.`, 400);
  }
}
