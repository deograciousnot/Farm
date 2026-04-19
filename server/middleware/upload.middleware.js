import multer from "multer";

import { AppError } from "../utils/app-error.js";

const storage = multer.memoryStorage();

function fileFilter(_req, file, callback) {
  const isAccepted = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");

  if (!isAccepted) {
    callback(new AppError("Only image and video uploads are supported.", 400));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 6,
  },
  fileFilter,
});
