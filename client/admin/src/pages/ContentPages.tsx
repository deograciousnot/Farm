import { useState } from "react";
import { EyeOff, Pin, PinOff, RotateCcw } from "lucide-react";

import { api } from "../api";
import { ListState, LoadMore, Pill, errorMessage, formatDate, useConfirm, usePaged, useToast } from "../components";
import type { CommunityThread, FeedPost, ModeratableType } from "../types";

type Item = { _id: string; isPinned: boolean; moderationStatus?: string; removedReason?: string };

/** Pin/unpin plus remove/restore, shared by the feed and discussion pages. */
function useModeration(targetType: ModeratableType, reload: () => Promise<void>, onChanged: () => void) {
  const confirm = useConfirm();
  const toast = useToast();

  async function run(action: () => Promise<unknown>, success: string) {
    await action();
    toast(success);
    onChanged();
    await reload();
  }

  return {
    togglePin: (item: Item, pin: (id: string, pinned: boolean) => Promise<unknown>) =>
      void run(() => pin(item._id, !item.isPinned), item.isPinned ? "Unpinned" : "Pinned to the top").catch((error) =>
        toast(errorMessage(error), "error")
      ),
    remove: (item: Item, label: string) =>
      confirm({
        title: `Remove “${label}”?`,
        body: "It disappears from the app and the author is notified with your reason. You can restore it later.",
        confirmLabel: "Remove",
        reason: "required",
        onConfirm: (reason) => run(() => api.moderate(targetType, item._id, "removed", reason), "Removed"),
      }),
    restore: (item: Item) =>
      void run(() => api.moderate(targetType, item._id, "active"), "Restored").catch((error) => toast(errorMessage(error), "error")),
  };
}

function ModerationActions({ item, onPin, onRemove, onRestore }: { item: Item; onPin: () => void; onRemove: () => void; onRestore: () => void }) {
  const isRemoved = item.moderationStatus === "removed";

  return (
    <div className="actions">
      {!isRemoved ? (
        <button className="ghost" onClick={onPin}>
          {item.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          {item.isPinned ? "Unpin" : "Pin"}
        </button>
      ) : null}
      {isRemoved ? (
        <button className="ghost" onClick={onRestore}>
          <RotateCcw size={16} />
          Restore
        </button>
      ) : (
        <button className="danger-button" onClick={onRemove}>
          <EyeOff size={16} />
          Remove
        </button>
      )}
    </div>
  );
}

function StatusFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Status">
      <option value="all">All</option>
      <option value="active">Live</option>
      <option value="pinned">Pinned</option>
      <option value="removed">Removed</option>
    </select>
  );
}

export function FeedPage({ onChanged }: { onChanged: () => void }) {
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("all");
  const list = usePaged((page) => api.getFeed({ page, sort, status }), `${sort}|${status}`);
  const moderation = useModeration("post", list.reload, onChanged);

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Feed posts</h2>
          <p>{list.total} posts. Pin field notes worth everyone's time; remove anything unsafe or misleading.</p>
        </div>
        <div className="control-row">
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="top-liked">Most liked</option>
            <option value="top-saved">Most saved</option>
            <option value="most-commented">Most discussed</option>
          </select>
          <StatusFilter value={status} onChange={setStatus} />
        </div>
      </div>
      <div className="table-list">
        <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No posts match." onRetry={() => void list.reload()} />
        {list.items.map((post: FeedPost) => (
          <article className={`moderation-row ${post.moderationStatus === "removed" ? "removed" : ""}`} key={post._id}>
            <div className="row-main">
              <div className="row-title">
                {post.isPinned ? <Pill tone="amber">Pinned</Pill> : null}
                {post.moderationStatus === "removed" ? <Pill tone="red">Removed</Pill> : null}
                {post.isSponsored ? <Pill>Sponsored</Pill> : null}
                <strong>{post.headline}</strong>
              </div>
              <p>{post.body}</p>
              <small>
                {post.author?.name} · {post.location || "No location"} · {post.likesCount} likes · {post.commentsCount} comments ·{" "}
                {formatDate(post.createdAt)}
              </small>
              {post.removedReason ? <small className="form-error">Removed: {post.removedReason}</small> : null}
            </div>
            <ModerationActions
              item={post}
              onPin={() => moderation.togglePin(post, api.pinPost)}
              onRemove={() => moderation.remove(post, post.headline)}
              onRestore={() => moderation.restore(post)}
            />
          </article>
        ))}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}

export function ThreadsPage({ onChanged }: { onChanged: () => void }) {
  const [sort, setSort] = useState("top");
  const [status, setStatus] = useState("all");
  const list = usePaged((page) => api.getThreads({ page, sort, status }), `${sort}|${status}`);
  const moderation = useModeration("thread", list.reload, onChanged);

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Community discussions</h2>
          <p>{list.total} discussions. Pin the questions that help the most farmers.</p>
        </div>
        <div className="control-row">
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort">
            <option value="top">Most active</option>
            <option value="newest">Newest</option>
          </select>
          <StatusFilter value={status} onChange={setStatus} />
        </div>
      </div>
      <div className="table-list">
        <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No discussions match." onRetry={() => void list.reload()} />
        {list.items.map((thread: CommunityThread) => (
          <article className={`moderation-row ${thread.moderationStatus === "removed" ? "removed" : ""}`} key={thread._id}>
            <div className="row-main">
              <div className="row-title">
                {thread.isPinned ? <Pill tone="amber">Pinned</Pill> : null}
                {thread.moderationStatus === "removed" ? <Pill tone="red">Removed</Pill> : null}
                <Pill>{thread.category}</Pill>
                <strong>{thread.title}</strong>
              </div>
              <p>{thread.preview || thread.body}</p>
              <small>
                {thread.author?.name} · {thread.repliesCount} answers · {thread.viewsCount} views · {formatDate(thread.createdAt)}
              </small>
              {thread.removedReason ? <small className="form-error">Removed: {thread.removedReason}</small> : null}
            </div>
            <ModerationActions
              item={thread}
              onPin={() => moderation.togglePin(thread, api.pinThread)}
              onRemove={() => moderation.remove(thread, thread.title)}
              onRestore={() => moderation.restore(thread)}
            />
          </article>
        ))}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}

export function NotificationsPage() {
  const [type, setType] = useState("all");
  const list = usePaged((page) => api.getNotifications({ page, type }), type);
  const confirm = useConfirm();
  const toast = useToast();

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Notifications</h2>
          <p>Remove stale or test notices from people's inboxes.</p>
        </div>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Type">
          <option value="all">All types</option>
          <option value="system">System</option>
          <option value="community">Community</option>
          <option value="order">Orders</option>
          <option value="like">Likes</option>
          <option value="comment">Comments</option>
          <option value="reply">Replies</option>
        </select>
      </div>
      <div className="table-list">
        <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No notifications match." onRetry={() => void list.reload()} />
        {list.items.map((notification) => (
          <article className="moderation-row" key={notification._id}>
            <div className="row-main">
              <div className="row-title">
                <Pill capitalize>{notification.type}</Pill>
                {!notification.isRead ? <Pill tone="amber">Unread</Pill> : null}
                <strong>{notification.title}</strong>
              </div>
              <p>{notification.body}</p>
              <small>
                To {notification.user?.name ?? "a deleted account"} · {formatDate(notification.createdAt)}
              </small>
            </div>
            <div className="actions">
              <button
                className="ghost"
                onClick={() =>
                  confirm({
                    title: "Delete this notification?",
                    body: `It will disappear from ${notification.user?.name ?? "the user"}'s inbox.`,
                    confirmLabel: "Delete",
                    onConfirm: async () => {
                      await api.deleteNotification(notification._id);
                      toast("Notification deleted");
                      await list.reload();
                    },
                  })
                }>
                Delete
              </button>
            </div>
          </article>
        ))}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}

const actionLabels: Record<string, string> = {
  "content.remove": "Removed content",
  "content.restore": "Restored content",
  "user.suspend": "Suspended account",
  "user.reinstate": "Reinstated account",
  "user.verification": "Changed verification",
  "report.reviewed": "Marked report reviewed",
  "report.dismissed": "Dismissed report",
  "report.pending": "Reopened report",
  "post.pin": "Pinned post",
  "post.unpin": "Unpinned post",
  "thread.pin": "Pinned discussion",
  "thread.unpin": "Unpinned discussion",
  "notification.delete": "Deleted notification",
  "product.feature": "Featured listing",
  "product.unfeature": "Unfeatured listing",
  "order.cancel": "Cancelled order",
  "analytics.export": "Exported partner report",
  "broadcast.draft": "Drafted broadcast",
  "broadcast.publish": "Published broadcast",
  "broadcast.archive": "Archived broadcast",
  "organization.create": "Added organisation",
  "organization.update": "Updated organisation",
};

export function describeAction(action: string) {
  return actionLabels[action] ?? action;
}

export function AuditPage() {
  const [action, setAction] = useState("all");
  const list = usePaged((page) => api.getAudit({ page, action }), action);

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Audit log</h2>
          <p>Every admin action, who took it, and why.</p>
        </div>
        <select value={action} onChange={(event) => setAction(event.target.value)} aria-label="Action type">
          <option value="all">All actions</option>
          <option value="content.">Content</option>
          <option value="user.">Accounts</option>
          <option value="report.">Reports</option>
          <option value="order.">Orders</option>
          <option value="analytics.">Exports</option>
          <option value="broadcast.">Broadcasts</option>
        </select>
      </div>
      <div className="table-list">
        <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No admin actions yet." onRetry={() => void list.reload()} />
        {list.items.map((entry) => (
          <article className="audit-row" key={entry._id}>
            <div className="row-main">
              <div className="row-title">
                <strong>{describeAction(entry.action)}</strong>
                <Pill capitalize>{entry.targetType}</Pill>
              </div>
              <p>{entry.summary}</p>
              {entry.reason ? <small className="muted">Reason: {entry.reason}</small> : null}
            </div>
            <small className="muted audit-meta">
              {entry.admin?.name ?? "Unknown admin"}
              <br />
              {formatDate(entry.createdAt)}
            </small>
          </article>
        ))}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}
