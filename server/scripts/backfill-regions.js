// Fill in the `county` field derived from free-text locations for existing records.
//   npm run server:backfill-regions
import { connectToDatabase, disconnectFromDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { resolveCounty } from "../utils/regions.js";

async function backfill(Model, field) {
  const docs = await Model.find({}, { [field]: 1, county: 1 }).lean();
  const unresolved = new Set();
  let updated = 0;

  for (const doc of docs) {
    const county = resolveCounty(doc[field]);
    if (!county && doc[field]) unresolved.add(doc[field]);
    if (county !== (doc.county ?? null)) {
      await Model.updateOne({ _id: doc._id }, { $set: { county } });
      updated += 1;
    }
  }

  console.log(`${Model.modelName}: ${updated} of ${docs.length} updated.`);
  if (unresolved.size) console.log(`  Unrecognised locations: ${[...unresolved].join(", ")}`);
}

async function main() {
  validateEnv();
  await connectToDatabase();
  await backfill(User, "location");
  await backfill(Product, "location");
  await backfill(Post, "location");
  await backfill(Order, "deliveryLocation");
}

main()
  .catch((error) => {
    console.error("Failed to backfill regions.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
