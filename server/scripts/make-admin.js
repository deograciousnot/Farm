// Grant or revoke admin dashboard access for an existing FarmConnect account.
//   npm run server:make-admin -- you@example.com
//   npm run server:make-admin -- you@example.com --revoke
import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { User } from "../models/user.model.js";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"))?.toLowerCase();
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("Usage: npm run server:make-admin -- <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  validateEnv();
  await connectToDatabase();

  const user = await User.findOne({ email });

  if (!user || user.accountStatus === "deleted") {
    console.error(`No active account found for ${email}. Sign up in the app first, then run this again.`);
    process.exitCode = 1;
    return;
  }

  user.isAdmin = !revoke;
  await user.save();
  console.log(`${revoke ? "Revoked" : "Granted"} admin access for ${user.name} <${email}>.`);
}

main()
  .catch((error) => {
    console.error("Failed to update admin access.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
