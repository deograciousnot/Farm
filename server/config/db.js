import mongoose from "mongoose";
import dns from "node:dns";

import { env } from "./env.js";

export async function connectToDatabase() {
  mongoose.set("strictQuery", true);

  if (env.mongoDnsServers.length > 0) {
    dns.setServers(env.mongoDnsServers);
  }

  await mongoose.connect(env.mongoUri);
  console.log("Connected to MongoDB.");
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
