import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { User } from "../models/user.model.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

async function main() {
  validateEnv();
  await connectToDatabase();

  const users = await User.find({}, "_id name");

  for (const user of users) {
    await recalculateTrustScoreForUser(user._id);
    console.log(`Updated trust score for ${user.name}`);
  }

  console.log(`Recalculated trust scores for ${users.length} users.`);
}

main()
  .catch((error) => {
    console.error("Failed to recalculate trust scores.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
