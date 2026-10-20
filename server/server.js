import { createApp } from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";
import { expireBoosts } from "./services/payments.js";

const app = createApp();

async function startServer() {
  validateEnv();
  await connectToDatabase();

  // Paid boosts end on their own; this clears the flag so they stop sorting first in the market.
  const sweepBoosts = () => expireBoosts().catch((error) => console.error("Couldn't expire listing boosts", error.message));
  void sweepBoosts();
  setInterval(sweepBoosts, 10 * 60_000).unref();

  app.listen(env.port, () => {
    console.log(`FarmConnect API is running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start FarmConnect API.", error);
  process.exit(1);
});
