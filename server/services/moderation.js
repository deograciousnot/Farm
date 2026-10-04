import { AdminAction } from "../models/admin-action.model.js";
import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { notRemoved } from "../models/moderation-fields.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { Report } from "../models/report.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { createNotification } from "../utils/notifications.js";
import { assertObjectId } from "../utils/request.js";

/**
 * Admin moderation: remove/restore content, suspend accounts, and record every action in the audit log.
 * Shared by the report queue and the per-type admin screens.
 */

export const USER_FIELDS = "name email role location avatarUrl verificationStatus";

export const SUSPENDED_SELLER_REASON = "seller-suspended";

export function moderationFilter(status) {
  if (status === "active") return { ...notRemoved };
  if (status === "removed") return { moderationStatus: "removed" };
  if (status === "pinned") return { isPinned: true, ...notRemoved };
  return {};
}

export function logAction(req, { action, targetType, target, summary = "", reason = "" }) {
  return AdminAction.create({ admin: req.user._id, action, targetType, target, summary, reason });
}

export const contentTypes = {
  post: { model: Post, owner: "author", label: "post", describe: (doc) => doc.headline },
  thread: { model: CommunityThread, owner: "author", label: "discussion", describe: (doc) => doc.title },
  comment: { model: Comment, owner: "author", label: "comment", describe: (doc) => doc.body },
  reply: { model: ThreadReply, owner: "author", label: "answer", describe: (doc) => doc.body },
  product: { model: Product, owner: "seller", label: "listing", describe: (doc) => doc.name },
};

export function truncate(text = "", length = 120) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** Remove or restore one piece of content, keep parent counters right, and close its reports. */
export async function setContentStatus(req, targetType, id, status, reason = "") {
  const config = contentTypes[targetType];

  if (!config) {
    throw new AppError("This content type can't be moderated.", 400);
  }

  if (!["active", "removed"].includes(status)) {
    throw new AppError("Status must be active or removed.", 400);
  }

  assertObjectId(id);
  const doc = await config.model.findById(id);

  if (!doc) {
    throw new AppError(`That ${config.label} no longer exists.`, 404);
  }

  const wasRemoved = doc.moderationStatus === "removed";
  const isRemoving = status === "removed";

  if (wasRemoved !== isRemoving) {
    doc.moderationStatus = status;
    doc.removedReason = isRemoving ? reason : "";
    doc.removedAt = isRemoving ? new Date() : null;

    if (isRemoving && "isPinned" in doc) {
      doc.isPinned = false;
    }

    await doc.save();

    // Comment and reply counts are stored on the parent, so keep them in step.
    // The $gt guard keeps a counter from going negative if it was already out of step.
    const adjustCount = (model, id, field) =>
      model.updateOne(isRemoving ? { _id: id, [field]: { $gt: 0 } } : { _id: id }, { $inc: { [field]: isRemoving ? -1 : 1 } });
    if (targetType === "comment") {
      await adjustCount(Post, doc.post, "commentsCount");
    }
    if (targetType === "reply") {
      await adjustCount(CommunityThread, doc.thread, "repliesCount");
    }

    if (isRemoving) {
      await createNotification({
        userId: doc[config.owner],
        type: "system",
        title: `Your ${config.label} was removed`,
        body: `"${truncate(config.describe(doc), 80)}" was removed by FarmConnect moderators${reason ? `: ${reason}` : "."}`,
      });
    }

    await logAction(req, {
      action: isRemoving ? "content.remove" : "content.restore",
      targetType,
      target: doc._id,
      summary: truncate(config.describe(doc)),
      reason,
    });
  }

  await Report.updateMany(
    { targetType, target: doc._id, status: "pending" },
    { status: isRemoving ? "actioned" : "reviewed", reviewedAt: new Date() }
  );

  return doc;
}

/** Suspend or reinstate an account. Suspension also hides the seller's listings until reinstated. */
export async function setUserStatus(req, userId, status, reason = "") {
  if (!["active", "suspended"].includes(status)) {
    throw new AppError("Status must be active or suspended.", 400);
  }

  assertObjectId(userId, "user id");
  const user = await User.findById(userId);

  if (!user || user.accountStatus === "deleted") {
    throw new AppError("User not found.", 404);
  }

  if (status === "suspended" && (user.isAdmin || String(user._id) === String(req.user._id))) {
    throw new AppError("Admins can't be suspended from the dashboard.", 400);
  }

  if (user.accountStatus !== status) {
    user.accountStatus = status;
    user.suspendedReason = status === "suspended" ? reason : "";
    user.suspendedAt = status === "suspended" ? new Date() : null;
    await user.save();

    if (status === "suspended") {
      await Product.updateMany(
        { seller: user._id, ...notRemoved },
        { moderationStatus: "removed", removedReason: SUSPENDED_SELLER_REASON, removedAt: new Date() }
      );
    } else {
      await Product.updateMany(
        { seller: user._id, moderationStatus: "removed", removedReason: SUSPENDED_SELLER_REASON },
        { moderationStatus: "active", removedReason: "", removedAt: null }
      );
    }

    await logAction(req, {
      action: status === "suspended" ? "user.suspend" : "user.reinstate",
      targetType: "user",
      target: user._id,
      summary: `${user.name} (${user.email || user.verifiedPhone || user.phone})`,
      reason,
    });
  }

  await Report.updateMany(
    { targetType: "user", target: user._id, status: "pending" },
    { status: status === "suspended" ? "actioned" : "reviewed", reviewedAt: new Date() }
  );

  return user;
}

/** Attach a readable preview of each report's target so moderators can judge it in place. */
export async function attachReportTargets(reports) {
  const idsByType = {};

  reports.forEach((report) => {
    (idsByType[report.targetType] ??= []).push(report.target);
  });

  const previews = new Map();
  const key = (type, id) => `${type}:${id}`;

  await Promise.all(
    Object.entries(idsByType).map(async ([type, ids]) => {
      if (type === "user") {
        const users = await User.find({ _id: { $in: ids } })
          .select("name email phone role location avatarUrl bio verificationStatus accountStatus")
          .lean();
        users.forEach((user) =>
          previews.set(key(type, user._id), {
            title: user.name,
            body: user.bio || `${user.role} · ${user.location}`,
            author: { _id: user._id, name: user.name, email: user.email || user.phone },
            status: user.accountStatus === "suspended" ? "suspended" : user.accountStatus === "deleted" ? "missing" : "active",
            context: user.email || user.phone,
          })
        );
        return;
      }

      const config = contentTypes[type];
      if (!config) return;

      let query = config.model.find({ _id: { $in: ids } }).populate(config.owner, USER_FIELDS);
      if (type === "comment") query = query.populate("post", "headline");
      if (type === "reply") query = query.populate("thread", "title");
      const docs = await query.lean();

      docs.forEach((doc) => {
        const owner = doc[config.owner];
        previews.set(key(type, doc._id), {
          title: type === "post" ? doc.headline : type === "thread" ? doc.title : type === "product" ? doc.name : truncate(doc.body, 80),
          body: type === "product" ? doc.description : doc.body,
          author: owner ? { _id: owner._id, name: owner.name, email: owner.email } : null,
          status: doc.moderationStatus === "removed" ? "removed" : "active",
          context:
            type === "comment"
              ? `Comment on “${doc.post?.headline ?? "a deleted post"}”`
              : type === "reply"
                ? `Answer in “${doc.thread?.title ?? "a deleted discussion"}”`
                : type === "product"
                  ? `KES ${doc.price} / ${doc.unit} · ${doc.location}`
                  : "",
        });
      });
    })
  );

  return reports.map((report) => ({
    ...report,
    preview: previews.get(key(report.targetType, report.target)) ?? { title: "Content no longer exists", body: "", status: "missing" },
  }));
}

/**
 * Take down everything a member has published (spam clean-up). Listings are handled by suspension.
 * Comment and answer counts on the parent posts and discussions are reduced to match.
 */
export async function removeAllContentBy(req, user, reason = "") {
  const removal = { moderationStatus: "removed", removedReason: reason || "Removed with the author's account", removedAt: new Date() };
  const mine = { author: user._id, ...notRemoved };

  const [comments, replies] = await Promise.all([
    Comment.find(mine).select("post").lean(),
    ThreadReply.find(mine).select("thread").lean(),
  ]);

  const [posts, threads] = await Promise.all([Post.updateMany(mine, removal), CommunityThread.updateMany(mine, removal)]);
  await Promise.all([Comment.updateMany(mine, removal), ThreadReply.updateMany(mine, removal)]);

  const decrement = async (Model, field, ids) => {
    const counts = ids.reduce((map, id) => map.set(String(id), (map.get(String(id)) ?? 0) + 1), new Map());
    await Promise.all([...counts].map(([id, count]) => Model.updateOne({ _id: id }, { $inc: { [field]: -count } })));
    await Model.updateMany({ [field]: { $lt: 0 } }, { $set: { [field]: 0 } });
  };
  await decrement(Post, "commentsCount", comments.map((comment) => comment.post));
  await decrement(CommunityThread, "repliesCount", replies.map((reply) => reply.thread));

  const summary = { posts: posts.modifiedCount, discussions: threads.modifiedCount, comments: comments.length, answers: replies.length };
  await logAction(req, {
    action: "user.purge",
    targetType: "user",
    target: user._id,
    summary: `${user.name}: removed ${summary.posts} posts, ${summary.discussions} discussions, ${summary.comments} comments, ${summary.answers} answers`,
    reason,
  });

  return summary;
}
