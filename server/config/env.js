import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: rootEnvPath });

function normalizeList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGO_URI || "",
  mongoDnsServers: normalizeList(process.env.MONGO_DNS_SERVERS),
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminSecret: process.env.ADMIN_SECRET || "",
  // Where users reach a person; keep in step with SUPPORT_EMAIL in the mobile app's constants/legal.ts.
  supportEmail: process.env.SUPPORT_EMAIL || "ardesamsco@gmail.com",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  allowedOrigins: normalizeList(process.env.ALLOWED_ORIGINS),
  // SMS sign-in codes (Africa's Talking). Leave empty in development to print codes to the console.
  africasTalkingUsername: process.env.AT_USERNAME || "",
  africasTalkingApiKey: process.env.AT_API_KEY || "",
  africasTalkingSenderId: process.env.AT_SENDER_ID || "",
  // Email codes (Resend). Leave empty in development to print emails to the console.
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "FarmConnect <onboarding@resend.dev>",
};

export function validateEnv() {
  const requiredKeys = ["mongoUri", "jwtSecret"];
  const missingKeys = requiredKeys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}. Update the root .env file.`
    );
  }
}
