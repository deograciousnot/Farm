import mongoose from "mongoose";

import { Report } from "../models/report.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const REPORTABLE_TYPES = ["post", "comment", "thread", "reply", "product", "user"];

export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, note = "" } = req.body;

  if (!REPORTABLE_TYPES.includes(targetType)) {
    throw new AppError("Invalid report target type.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid report target.", 400);
  }

  if (!reason?.trim()) {
    throw new AppError("Report reason is required.", 400);
  }

  const report = await Report.create({
    targetType,
    target: targetId,
    reporter: req.user._id,
    reason: reason.trim(),
    note: note.trim(),
  });

  res.status(201).json({
    message: "Report submitted for review.",
    item: report,
  });
});
