import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { AppError } from "./app-error.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// Accounts younger than this can only publish a few items, so throwaway accounts can't flood the app.
const NEW_ACCOUNT_DAILY_LIMIT = 5;

const sources = [
  { model: Post, owner: "author", text: "body" },
  { model: CommunityThread, owner: "author", text: "body" },
  { model: ThreadReply, owner: "author", text: "body" },
  { model: Comment, owner: "author", text: "body" },
  { model: Product, owner: "seller", text: "description" },
];

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Call before creating user content. Throws if a brand-new account has hit its daily allowance,
 * or if the member already posted the same text in the last day.
 */
export async function assertCanPublish(user, { model, text }) {
  const since = new Date(Date.now() - DAY_MS);
  const isNewAccount = user.createdAt && Date.now() - new Date(user.createdAt).getTime() < DAY_MS;

  if (isNewAccount) {
    const counts = await Promise.all(sources.map((source) => source.model.countDocuments({ [source.owner]: user._id, createdAt: { $gte: since } })));
    if (counts.reduce((sum, count) => sum + count, 0) >= NEW_ACCOUNT_DAILY_LIMIT) {
      throw new AppError("New accounts can post a few times on their first day. You'll be able to post more tomorrow.", 429);
    }
  }

  const source = sources.find((entry) => entry.model === model);
  const normalized = normalize(text);

  if (source && normalized.length >= 12) {
    const recent = await source.model
      .find({ [source.owner]: user._id, createdAt: { $gte: since } })
      .select(source.text)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (recent.some((item) => normalize(item[source.text]) === normalized)) {
      throw new AppError("You've already posted this. Duplicate posts are blocked to keep the feed useful.", 409);
    }
  }
}
