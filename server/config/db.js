import mongoose from "mongoose";

import { env } from "./env.js";

export async function connectToDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri);
  console.log("Connected to MongoDB.");
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
