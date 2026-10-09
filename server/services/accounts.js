import { Comment } from "../models/comment.model.js";
import { CommunityThread } from "../models/community-thread.model.js";
import { LikedPost } from "../models/liked-post.model.js";
import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Post } from "../models/post.model.js";
import { Product } from "../models/product.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { SellerRemark } from "../models/seller-remark.model.js";
import { ThreadReply } from "../models/thread-reply.model.js";
import { User } from "../models/user.model.js";

/**
 * Delete an account: remove everything it posted and strip its personal data, keeping an
 * anonymised "Deleted account" record so orders it was part of still make sense.
 * Shared by self-service account deletion and the admin bulk delete.
 */
export async function deleteUserAccount(user) {
  const userId = user._id;
  const [posts, threads] = await Promise.all([
    Post.find({ author: userId }).select("_id").lean(),
    CommunityThread.find({ author: userId }).select("_id").lean(),
  ]);
  const postIds = posts.map((post) => post._id);
  const threadIds = threads.map((thread) => thread._id);

  await Promise.all([
    Comment.deleteMany({ $or: [{ author: userId }, { post: { $in: postIds } }] }),
    LikedPost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    SavedPost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    SellerRemark.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
    ThreadReply.deleteMany({ $or: [{ author: userId }, { thread: { $in: threadIds } }] }),
    Post.deleteMany({ author: userId }),
    Product.deleteMany({ seller: userId }),
    CommunityThread.deleteMany({ author: userId }),
    Notification.deleteMany({ user: userId }),
    User.updateMany({}, { $pull: { followers: userId, following: userId } }),
    Order.updateMany(
      { buyer: userId },
      {
        $set: {
          deliveryContact: "",
          deliveryLocation: "Removed at account deletion",
          note: "",
        },
      }
    ),
    Order.updateMany(
      { seller: userId },
      {
        $set: {
          note: "",
        },
      }
    ),
  ]);

  user.name = "Deleted account";
  user.email = `deleted-${userId}@farmconnect.local`;
  user.password = `${userId}-${Date.now()}-disabled`;
  user.role = "buyer";
  user.location = "Removed";
  user.interests = [];
  user.bio = "";
  user.avatarUrl = "";
  user.phone = "";
  // Free the number so it can sign up again later.
  user.verifiedPhone = undefined;
  user.verificationStatus = "unverified";
  user.trustScore = 0;
  user.following = [];
  user.followers = [];
  user.accountStatus = "deleted";
  user.deletedAt = new Date();
  await user.save();

  return user;
}
