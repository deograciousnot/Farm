// Copies every collection to backups/<timestamp>/ as Extended JSON, keeping the newest 14 backups.
// Backups hold users' personal data: they stay on this machine (backups/ is git-ignored).
//   npm run server:backup
// Restore one with:  npm run server:restore -- backups/<timestamp> --wipe
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";

const KEEP = 14;
const backupsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backups");
const { EJSON } = mongoose.mongo.BSON;

async function main() {
  validateEnv();
  await connectToDatabase();

  const { db } = mongoose.connection;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupsRoot, stamp);
  await fs.mkdir(target, { recursive: true });

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name).sort();
  const counts = {};

  for (const name of collections) {
    const documents = await db.collection(name).find({}).toArray();
    await fs.writeFile(path.join(target, `${name}.json`), EJSON.stringify(documents, { relaxed: false }));
    counts[name] = documents.length;
  }

  console.log(`Backed up ${mongoose.connection.name} on ${mongoose.connection.host} to ${target}`);
  console.table(counts);

  // Keep only the newest backups so old personal data doesn't pile up (the privacy policy promises 30 days at most).
  const existing = (await fs.readdir(backupsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const old of existing.slice(0, Math.max(0, existing.length - KEEP))) {
    await fs.rm(path.join(backupsRoot, old), { recursive: true, force: true });
    console.log(`Removed old backup ${old}`);
  }
}

main()
  .catch((error) => {
    console.error("Backup failed.", error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
