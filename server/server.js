import { createApp } from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";

const app = createApp();

async function startServer() {
  validateEnv();
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`FarmConnect API is running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start FarmConnect API.", error);
  process.exit(1);
});
