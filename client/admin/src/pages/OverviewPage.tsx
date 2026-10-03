import { AlertTriangle, ArrowRight, Flag, MessageSquare, ThumbsUp, UserCheck } from "lucide-react";

import { formatDate } from "../components";
import type { OverviewResponse } from "../types";
import { describeAction } from "./ContentPages";

type Tab = "reports" | "users" | "audit" | "orders";

function Metric({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "red" }) {
  return (
    <article className={`metric-card ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{(value ?? 0).toLocaleString("en-KE")}</strong>
    </article>
  );
}

export function OverviewPage({ data, onNavigate }: { data: OverviewResponse; onNavigate: (tab: Tab) => void }) {
  const { stats } = data;

  return (
    <section className="panel-grid">
      <div className="todo-grid">
        <button className={`todo-card ${stats.pendingReports ? "urgent" : ""}`} onClick={() => onNavigate("reports")}>
          <Flag size={22} />
          <div>
            <strong>{stats.pendingReports} {stats.pendingReports === 1 ? "report" : "reports"} to review</strong>
            <span>{stats.pendingReports ? "People flagged content that may break the rules." : "Nothing waiting. Nice."}</span>
          </div>
          <ArrowRight size={18} />
        </button>
        <button className={`todo-card ${stats.pendingVerifications ? "urgent" : ""}`} onClick={() => onNavigate("users")}>
          <UserCheck size={22} />
          <div>
            <strong>{stats.pendingVerifications} {stats.pendingVerifications === 1 ? "farmer" : "farmers"} to verify</strong>
            <span>Verified sellers get a badge, and buyers can call them.</span>
          </div>
          <ArrowRight size={18} />
        </button>
        <button className={`todo-card ${stats.stuckOrders ? "urgent" : ""}`} onClick={() => onNavigate("orders")}>
          <AlertTriangle size={22} />
          <div>
            <strong>
              {stats.stuckOrders} {stats.stuckOrders === 1 ? "order" : "orders"} stuck
            </strong>
            <span>Waiting days for a seller. A nudge or a cancellation keeps buyers' trust.</span>
          </div>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="metrics-grid">
        <Metric label="People" value={stats.totalUsers} />
        <Metric label="Live posts" value={stats.activePosts} tone="green" />
        <Metric label="Discussions" value={stats.totalThreads} tone="green" />
        <Metric label="Listings" value={stats.totalListings} />
        <Metric label="Orders" value={stats.totalOrders} />
        <Metric label="Removed" value={(stats.removedPosts ?? 0) + (stats.removedThreads ?? 0)} tone="red" />
        <Metric label="Suspended" value={stats.suspendedUsers} tone="red" />
      </div>

      <div className="split-grid">
        <section className="card">
          <div className="card-head">
            <h2>Most liked posts</h2>
            <ThumbsUp size={18} />
          </div>
          <div className="stack">
            {data.topPosts.map((post) => (
              <div className="compact-row" key={post._id}>
                <div>
                  <strong>{post.headline}</strong>
                  <span>
                    {post.author?.name} · {post.likesCount} likes · {post.commentsCount} comments
                  </span>
                </div>
                {post.isPinned ? <span className="pill amber">Pinned</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Most active discussions</h2>
            <MessageSquare size={18} />
          </div>
          <div className="stack">
            {data.topThreads.map((thread) => (
              <div className="compact-row" key={thread._id}>
                <div>
                  <strong>{thread.title}</strong>
                  <span>
                    {thread.category} · {thread.repliesCount} answers · {thread.viewsCount} views
                  </span>
                </div>
                {thread.isPinned ? <span className="pill amber">Pinned</span> : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recent admin activity</h2>
          <button className="link-button" onClick={() => onNavigate("audit")}>
            Full audit log
          </button>
        </div>
        <div className="stack">
          {data.recentActions.length ? (
            data.recentActions.map((entry) => (
              <div className="compact-row" key={entry._id}>
                <div>
                  <strong>
                    {describeAction(entry.action)}: {entry.summary}
                  </strong>
                  <span>
                    {entry.admin?.name ?? "Unknown admin"} · {formatDate(entry.createdAt)}
                    {entry.reason ? ` · “${entry.reason}”` : ""}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">No admin actions yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}
