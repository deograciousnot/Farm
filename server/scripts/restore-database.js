// Restores a backup made by backup-database.js. Every collection in the backup replaces the
// current one, so it asks for an explicit flag:
//   npm run server:restore -- backups/<timestamp> --wipe
import fs from "node:fs/promises";
import path from "node:path";

import mongoose from "mongoose";

import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";

const { EJSON } = mongoose.mongo.BSON;

async function main() {
  const source = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

  if (!source || !process.argv.includes("--wipe")) {
    console.error("Usage: npm run server:restore -- backups/<timestamp> --wipe");
    console.error("Each collection in the backup replaces the current one.");
    process.exitCode = 1;
    return;
  }

  const files = (await fs.readdir(source)).filter((file) => file.endsWith(".json"));

  validateEnv();
  await connectToDatabase();
  console.log(`Restoring ${source} into ${mongoose.connection.name} on ${mongoose.connection.host}`);

  const { db } = mongoose.connection;

  for (const file of files) {
    const name = path.basename(file, ".json");
    const documents = EJSON.parse(await fs.readFile(path.join(source, file), "utf8"), { relaxed: false });
    await db.collection(name).deleteMany({});

    if (documents.length) {
      await db.collection(name).insertMany(documents);
    }

    console.log(`  ${name}: ${documents.length}`);
  }

  console.log("Restore complete.");
}

main()
  .catch((error) => {
    console.error("Restore failed.", error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
