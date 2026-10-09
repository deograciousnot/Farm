import { unlink } from "node:fs";
import os from "node:os";

import multer from "multer";

import { AppError } from "../utils/app-error.js";

// Files go to a temp folder instead of memory: a few large videos at once would otherwise
// exhaust the small server's RAM. They are deleted when the response ends (see withCleanup).
const storage = multer.diskStorage({ destination: os.tmpdir() });
const maxUploadFileSizeMb = 40;

function fileFilter(_req, file, callback) {
  const isAccepted = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");

  if (!isAccepted) {
    callback(new AppError("Only image and video uploads are supported.", 400));
    return;
  }

  callback(null, true);
}

const multerUpload = multer({
  storage,
  limits: {
    fileSize: maxUploadFileSizeMb * 1024 * 1024,
    files: 6,
  },
  fileFilter,
});

function removeTempFiles(req) {
  const files = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
  files.forEach((file) => file.path && unlink(file.path, () => {}));
}

function withCleanup(middleware) {
  return (req, res, next) => {
    res.on("close", () => removeTempFiles(req));
    middleware(req, res, next);
  };
}

export const upload = {
  single: (field) => withCleanup(multerUpload.single(field)),
  array: (field, maxCount) => withCleanup(multerUpload.array(field, maxCount)),
};
