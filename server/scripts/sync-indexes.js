// Bring MongoDB indexes in line with the schemas (e.g. after making email optional for phone accounts).
//   npm run server:sync-indexes
import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { OtpCode } from "../models/otp-code.model.js";
import { User } from "../models/user.model.js";

async function main() {
  validateEnv();
  await connectToDatabase();

  for (const Model of [User, OtpCode]) {
    const dropped = await Model.syncIndexes();
    console.log(`${Model.modelName}: indexes synced${dropped.length ? `, replaced ${dropped.join(", ")}` : ""}.`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to sync indexes.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
