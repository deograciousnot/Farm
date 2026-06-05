import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  EyeOff,
  Flag,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Pin,
  PinOff,
  RefreshCcw,
  Shield,
  Sparkles,
  ThumbsUp,
  Trash2,
  Undo2,
} from "lucide-react";

import { api } from "./api";
import type { AdminNotification, CommunityThread, FeedPost, OverviewResponse, Report } from "./types";
import "./styles.css";

type Tab = "overview" | "reports" | "feed" | "threads" | "notifications";

const storedSecretKey = "farmconnect-admin-secret";

function formatDate(value?: string) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "red" }) {
  return (
    <article className={`metric-card ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString("en-KE")}</strong>
    </article>
  );
}

function AnalyticsBar({ label, value, max, tone }: { label: string; value: number; max: number; tone?: string }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div className="analytics-row">
      <div className="analytics-label">
        <span>{label}</span>
        <strong>{value.toLocaleString("en-KE")}</strong>
      </div>
      <div className="bar-track" aria-hidden="true">
        <div className={`bar-fill ${tone ?? ""}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SecretGate({ onUnlock }: { onUnlock: (secret: string) => void }) {
  const [secret, setSecret] = useState(localStorage.getItem(storedSecretKey) ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextSecret = secret.trim();
    if (!nextSecret) return;
    localStorage.setItem(storedSecretKey, nextSecret);
    onUnlock(nextSecret);
  }

  return (
    <main className="gate">
      <section className="gate-panel">
        <div className="brand-mark">
          <Shield size={30} />
        </div>
        <p className="eyebrow">FarmConnect Admin</p>
        <h1>Moderation cockpit</h1>
        <p className="muted">Enter your private admin secret to review content, pin posts, and manage community quality.</p>
        <form onSubmit={submit} className="gate-form">
          <input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            type="password"
            placeholder="ADMIN_SECRET"
            autoFocus
          />
          <button type="submit">
            <Shield size={17} />
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}

function Overview({ data }: { data: OverviewResponse }) {
  const contentMax = Math.max(data.stats.activePosts ?? 0, data.stats.totalThreads ?? 0, data.stats.totalListings ?? 0, 1);
  const moderationMax = Math.max(
    data.stats.pinnedPosts ?? 0,
    data.stats.removedPosts ?? 0,
    data.stats.pendingReports ?? 0,
    data.stats.unreadNotifications ?? 0,
    1
  );

  return (
    <section className="panel-grid">
      <div className="metrics-grid">
        <MetricCard label="Users" value={data.stats.totalUsers ?? 0} />
        <MetricCard label="Active posts" value={data.stats.activePosts ?? 0} tone="green" />
        <MetricCard label="Pinned posts" value={data.stats.pinnedPosts ?? 0} tone="amber" />
        <MetricCard label="Pending reports" value={data.stats.pendingReports ?? 0} tone="red" />
        <MetricCard label="Listings" value={data.stats.totalListings ?? 0} />
        <MetricCard label="Orders" value={data.stats.totalOrders ?? 0} />
        <MetricCard label="Unread notices" value={data.stats.unreadNotifications ?? 0} tone="amber" />
      </div>

      <div className="split-grid">
        <section className="card">
          <div className="card-head">
            <h2>Content activity</h2>
            <BarChart3 size={18} />
          </div>
          <div className="analytics-stack">
            <AnalyticsBar label="Active feed posts" value={data.stats.activePosts ?? 0} max={contentMax} tone="green" />
            <AnalyticsBar label="Community threads" value={data.stats.totalThreads ?? 0} max={contentMax} />
            <AnalyticsBar label="Marketplace listings" value={data.stats.totalListings ?? 0} max={contentMax} tone="amber" />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Moderation pressure</h2>
            <Sparkles size={18} />
          </div>
          <div className="analytics-stack">
            <AnalyticsBar label="Pinned feed posts" value={data.stats.pinnedPosts ?? 0} max={moderationMax} tone="amber" />
            <AnalyticsBar label="Removed posts" value={data.stats.removedPosts ?? 0} max={moderationMax} tone="red" />
            <AnalyticsBar label="Pending reports" value={data.stats.pendingReports ?? 0} max={moderationMax} tone="red" />
            <AnalyticsBar label="Unread notifications" value={data.stats.unreadNotifications ?? 0} max={moderationMax} />
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="card">
          <div className="card-head">
            <h2>Top liked feed</h2>
            <ThumbsUp size={18} />
          </div>
          <div className="stack">
            {data.topPosts.map((post) => (
              <div className="compact-row" key={post._id}>
                <div>
                  <strong>{post.headline}</strong>
                  <span>{post.author?.name} · {post.likesCount} likes · {post.commentsCount} comments</span>
                </div>
                {post.isPinned ? <span className="pill pinned">Pinned</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Top threads</h2>
            <MessageSquare size={18} />
          </div>
          <div className="stack">
            {data.topThreads.map((thread) => (
              <div className="compact-row" key={thread._id}>
                <div>
                  <strong>{thread.title}</strong>
                  <span>{thread.category} · {thread.repliesCount} replies · {thread.viewsCount} views</span>
                </div>
                {thread.isPinned ? <span className="pill pinned">Pinned</span> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function Notifications({
  notifications,
  type,
  onType,
  onDelete,
}: {
  notifications: AdminNotification[];
  type: string;
  onType: (value: string) => void;
  onDelete: (notification: AdminNotification) => void;
}) {
  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Notifications</h2>
          <p>Remove demo prompts or stale notices that should no longer appear in user profiles.</p>
        </div>
        <div className="control-row">
          <select value={type} onChange={(event) => onType(event.target.value)}>
            <option value="all">All notifications</option>
            <option value="community">Community</option>
            <option value="order">Orders</option>
            <option value="system">System</option>
            <option value="like">Likes</option>
            <option value="comment">Comments</option>
            <option value="reply">Replies</option>
          </select>
        </div>
      </div>
      <div className="table-list">
        {notifications.map((notification) => (
          <article className="moderation-row" key={notification._id}>
            <div className="row-main">
              <div className="row-title">
                <span className="pill">{notification.type}</span>
                {!notification.isRead ? <span className="pill pinned">Unread</span> : null}
                <strong>{notification.title}</strong>
              </div>
              <p>{notification.body}</p>
              <small>
                {notification.user?.name ?? "Unknown user"} - {formatDate(notification.createdAt)}
              </small>
            </div>
            <div className="actions">
              <button className="danger-button" onClick={() => onDelete(notification)}>
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </article>
        ))}
        {!notifications.length ? <p className="empty">No notifications match this filter.</p> : null}
      </div>
    </section>
  );
}

function Reports({
  reports,
  onUpdate,
}: {
  reports: Report[];
  onUpdate: (reportId: string, status: Report["status"]) => void;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Reported content</h2>
        <Flag size={18} />
      </div>
      <div className="table-list">
        {reports.map((report) => (
          <article className="moderation-row" key={report._id}>
            <div className="row-main">
              <div className="row-title">
                <span className="pill danger">{report.targetType}</span>
                <strong>{report.reason}</strong>
              </div>
              <p>{report.note || "No extra note provided."}</p>
              <small>
                Reported by {report.reporter?.name ?? "Unknown"} · {formatDate(report.createdAt)}
              </small>
            </div>
            <div className="actions">
              <button className="ghost" onClick={() => onUpdate(report._id, "reviewed")}>
                <CheckCircle2 size={16} />
                Reviewed
              </button>
              <button className="ghost" onClick={() => onUpdate(report._id, "dismissed")}>
                <Undo2 size={16} />
                Dismiss
              </button>
              <button className="danger-button" onClick={() => onUpdate(report._id, "actioned")}>
                <AlertTriangle size={16} />
                Actioned
              </button>
            </div>
          </article>
        ))}
        {!reports.length ? <p className="empty">No reports in this queue.</p> : null}
      </div>
    </section>
  );
}

function FeedModeration({
  posts,
  total,
  hasMore,
  isLoading,
  sort,
  status,
  onSort,
  onStatus,
  onLoadMore,
  onPin,
  onModerate,
}: {
  posts: FeedPost[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  sort: string;
  status: string;
  onSort: (value: string) => void;
  onStatus: (value: string) => void;
  onLoadMore: () => void;
  onPin: (post: FeedPost) => void;
  onModerate: (post: FeedPost, status: "active" | "removed") => void;
}) {
  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Feed moderation</h2>
          <p>
            Showing {posts.length.toLocaleString("en-KE")} of {total.toLocaleString("en-KE")} posts. Pin useful content or take
            down unsafe posts.
          </p>
        </div>
        <div className="control-row">
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="top-liked">Top liked</option>
            <option value="top-saved">Top saved</option>
            <option value="most-commented">Most commented</option>
            <option value="pinned">Pinned first</option>
          </select>
          <select value={status} onChange={(event) => onStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pinned">Pinned</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>
      <div className="table-list">
        {posts.map((post) => (
          <article className="moderation-row" key={post._id}>
            <div className="row-main">
              <div className="row-title">
                {post.isPinned ? <span className="pill pinned">Pinned</span> : null}
                {post.moderationStatus === "removed" ? <span className="pill danger">Removed</span> : null}
                {post.isSponsored ? <span className="pill">Sponsored</span> : null}
                <strong>{post.headline}</strong>
              </div>
              <p>{post.body}</p>
              <small>
                {post.author?.name} · {post.location || "No location"} · {post.likesCount} likes · {post.savesCount} saves ·{" "}
                {post.commentsCount} comments
              </small>
            </div>
            <div className="actions">
              <button className="ghost" onClick={() => onPin(post)}>
                {post.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {post.isPinned ? "Unpin" : "Pin"}
              </button>
              {post.moderationStatus === "removed" ? (
                <button className="ghost" onClick={() => onModerate(post, "active")}>
                  <Undo2 size={16} />
                  Restore
                </button>
              ) : (
                <button className="danger-button" onClick={() => onModerate(post, "removed")}>
                  <Trash2 size={16} />
                  Take down
                </button>
              )}
            </div>
          </article>
        ))}
        {!posts.length ? <p className="empty">No feed posts match this filter.</p> : null}
        {hasMore ? (
          <button className="load-more-button" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={16} /> : null}
            Load more posts
          </button>
        ) : posts.length ? (
          <p className="empty">All matching posts are visible.</p>
        ) : null}
      </div>
    </section>
  );
}

function ThreadModeration({
  threads,
  sort,
  status,
  onSort,
  onStatus,
  onPin,
  onModerate,
}: {
  threads: CommunityThread[];
  sort: string;
  status: string;
  onSort: (value: string) => void;
  onStatus: (value: string) => void;
  onPin: (thread: CommunityThread) => void;
  onModerate: (thread: CommunityThread, status: "active" | "removed") => void;
}) {
  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Community threads</h2>
          <p>Promote useful discussions and remove threads that should not stay public.</p>
        </div>
        <div className="control-row">
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="top">Top threads</option>
            <option value="newest">Newest</option>
            <option value="pinned">Pinned first</option>
          </select>
          <select value={status} onChange={(event) => onStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pinned">Pinned</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>
      <div className="table-list">
        {threads.map((thread) => (
          <article className="moderation-row" key={thread._id}>
            <div className="row-main">
              <div className="row-title">
                {thread.isPinned ? <span className="pill pinned">Pinned</span> : null}
                {thread.moderationStatus === "removed" ? <span className="pill danger">Removed</span> : null}
                <strong>{thread.title}</strong>
              </div>
              <p>{thread.preview || thread.body}</p>
              <small>
                {thread.author?.name} · {thread.category} · {thread.repliesCount} replies · {thread.viewsCount} views
              </small>
            </div>
            <div className="actions">
              <button className="ghost" onClick={() => onPin(thread)}>
                {thread.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {thread.isPinned ? "Unpin" : "Pin"}
              </button>
              {thread.moderationStatus === "removed" ? (
                <button className="ghost" onClick={() => onModerate(thread, "active")}>
                  <Undo2 size={16} />
                  Restore
                </button>
              ) : (
                <button className="danger-button" onClick={() => onModerate(thread, "removed")}>
                  <EyeOff size={16} />
                  Take down
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [secret, setSecret] = useState(localStorage.getItem(storedSecretKey) ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [feedSort, setFeedSort] = useState("newest");
  const [feedStatus, setFeedStatus] = useState("all");
  const [threadSortState, setThreadSortState] = useState("top");
  const [threadStatus, setThreadStatus] = useState("all");
  const [notificationType, setNotificationType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navItems = useMemo(
    () => [
      { key: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
      { key: "reports" as Tab, label: "Reports", icon: Flag },
      { key: "feed" as Tab, label: "Feed", icon: BarChart3 },
      { key: "threads" as Tab, label: "Threads", icon: MessageSquare },
      { key: "notifications" as Tab, label: "Notifications", icon: Bell },
    ],
    []
  );

  async function loadData(nextFeedPage = 1, appendFeed = false) {
    if (!secret) return;
    setIsLoading(true);
    setError("");

    try {
      const [overviewData, reportsData, feedData, threadData, notificationData] = await Promise.all([
        api.getOverview(secret),
        api.getReports(secret),
        api.getFeed(secret, { page: nextFeedPage, sort: feedSort, status: feedStatus }),
        api.getThreads(secret, { sort: threadSortState, status: threadStatus }),
        api.getNotifications(secret, notificationType),
      ]);
      setOverview(overviewData);
      setReports(reportsData.items);
      setPosts((current) => (appendFeed ? [...current, ...feedData.items] : feedData.items));
      setFeedPage(feedData.pagination.page);
      setFeedTotal(feedData.pagination.total);
      setFeedHasMore(feedData.pagination.hasMore);
      setThreads(threadData.items);
      setNotifications(notificationData.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(1, false);
  }, [secret, feedSort, feedStatus, threadSortState, threadStatus, notificationType]);

  async function act(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      await loadData(1, false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    }
  }

  if (!secret) {
    return <SecretGate onUnlock={setSecret} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark small">
              <Shield size={21} />
            </div>
            <div>
              <strong>FarmConnect</strong>
              <span>Admin</span>
            </div>
          </div>
          <nav>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <button
          className="ghost sidebar-button"
          onClick={() => {
            localStorage.removeItem(storedSecretKey);
            setSecret("");
          }}>
          Lock panel
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Moderation and growth</p>
            <h1>
              {tab === "overview"
                ? "Dashboard"
                : tab === "reports"
                  ? "Reports"
                  : tab === "feed"
                    ? "Feed control"
                    : tab === "threads"
                      ? "Community control"
                      : "Notification control"}
            </h1>
          </div>
          <button className="refresh-button" onClick={() => void loadData()} disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={17} /> : <RefreshCcw size={17} />}
            Refresh
          </button>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {tab === "overview" && overview ? <Overview data={overview} /> : null}
        {tab === "reports" ? (
          <Reports
            reports={reports}
            onUpdate={(reportId, status) => void act(() => api.updateReport(secret, reportId, status))}
          />
        ) : null}
        {tab === "feed" ? (
          <FeedModeration
            posts={posts}
            total={feedTotal}
            hasMore={feedHasMore}
            isLoading={isLoading}
            sort={feedSort}
            status={feedStatus}
            onSort={(value) => {
              setFeedPage(1);
              setFeedSort(value);
            }}
            onStatus={(value) => {
              setFeedPage(1);
              setFeedStatus(value);
            }}
            onLoadMore={() => void loadData(feedPage + 1, true)}
            onPin={(post) => void act(() => api.pinPost(secret, post._id, !post.isPinned))}
            onModerate={(post, status) =>
              void act(() =>
                api.moderatePost(secret, post._id, status, status === "removed" ? "Removed from admin dashboard" : "")
              )
            }
          />
        ) : null}
        {tab === "threads" ? (
          <ThreadModeration
            threads={threads}
            sort={threadSortState}
            status={threadStatus}
            onSort={setThreadSortState}
            onStatus={setThreadStatus}
            onPin={(thread) => void act(() => api.pinThread(secret, thread._id, !thread.isPinned))}
            onModerate={(thread, status) =>
              void act(() =>
                api.moderateThread(secret, thread._id, status, status === "removed" ? "Removed from admin dashboard" : "")
              )
            }
          />
        ) : null}
        {tab === "notifications" ? (
          <Notifications
            notifications={notifications}
            type={notificationType}
            onType={setNotificationType}
            onDelete={(notification) => void act(() => api.deleteNotification(secret, notification._id))}
          />
        ) : null}

        {isLoading && !overview ? (
          <div className="loading-state">
            <Loader2 className="spin" />
            Loading admin data
          </div>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
