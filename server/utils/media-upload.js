import { Readable } from "stream";

import { cloudinary, hasCloudinaryConfig } from "../config/cloudinary.js";
import { AppError } from "./app-error.js";

function inferResourceType(mimeType = "") {
  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "image";
}

export async function uploadBufferToCloudinary(file, { folder }) {
  if (!hasCloudinaryConfig) {
    throw new AppError("Cloudinary is not configured yet. Add your Cloudinary env keys first.", 500);
  }

  const resourceType = inferResourceType(file.mimetype);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          type: resourceType,
          url: result.secure_url,
          thumbnailUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

export async function uploadManyToCloudinary(files, options) {
  if (!files?.length) {
    return [];
  }

  return Promise.all(files.map((file) => uploadBufferToCloudinary(file, options)));
}
