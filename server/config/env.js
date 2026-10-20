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
  // M-Pesa payments (Safaricom Daraja STK push). Leave the keys empty in development to simulate payments.
  mpesa: {
    environment: process.env.MPESA_ENV === "production" ? "production" : "sandbox",
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    // Sandbox defaults are Safaricom's public test shortcode and passkey.
    shortcode: process.env.MPESA_SHORTCODE || "174379",
    passkey: process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    // CustomerPayBillOnline for a paybill, CustomerBuyGoodsOnline for a till (then set MPESA_TILL_NUMBER).
    transactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    tillNumber: process.env.MPESA_TILL_NUMBER || "",
    // Public https URL of this API, e.g. https://farmconnect-api.onrender.com. Safaricom posts results here.
    callbackBaseUrl: (process.env.MPESA_CALLBACK_BASE_URL || "").replace(/\/$/, ""),
    // Random string in the callback path so only Safaricom (who we give the URL to) can report payments.
    callbackSecret: process.env.MPESA_CALLBACK_SECRET || "",
  },
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
