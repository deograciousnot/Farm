import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Flag, Megaphone, MessageSquare, Minus, RefreshCcw, UserCheck } from "lucide-react";

import { BarList, formatNumber } from "../charts";
import { formatDate } from "../components";
import type { OverviewResponse } from "../types";
import { describeAction } from "./ContentPages";

type Tab = "reports" | "users" | "audit" | "orders" | "broadcasts" | "threads" | "analytics";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts up to `value` once, so the numbers arrive with a little life. Instant for reduced motion. */
function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease out: fast start, gentle landing.
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-KE", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const { line, area } = useMemo(() => {
    const width = 200;
    const height = 56;
    const max = Math.max(1, ...values);
    const step = width / Math.max(1, values.length - 1);
    const points = values.map((value, index) => [index * step, height - 4 - (value / max) * (height - 12)] as const);
    const path = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { line: path, area: `${path} L${width} ${height} L0 ${height} Z` };
  }, [values]);

  return (
    <svg className="sparkline" viewBox="0 0 200 56" preserveAspectRatio="none" role="img" aria-label={`${label}, daily for the last two weeks`}>
      <path className="area" d={area} />
      <path className="line" d={line} pathLength={1} />
    </svg>
  );
}

function Kpi({ label, series }: { label: string; series: number[] }) {
  const thisWeek = series.slice(-7).reduce((sum, value) => sum + value, 0);
  const lastWeek = series.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  const shown = useCountUp(thisWeek);

  const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const direction = change === null ? (thisWeek ? "up" : "flat") : change > 0 ? "up" : change < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <article className="card kpi-card">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{formatNumber(shown)}</strong>
      <span className={`kpi-delta ${direction}`}>
        <Icon size={15} aria-hidden="true" />
        {change === null ? (thisWeek ? "New this week" : "None yet") : change === 0 ? "Same as last week" : `${change > 0 ? "+" : ""}${change}%`}
        {change !== null && change !== 0 ? <small>vs last week</small> : null}
      </span>
      <Sparkline values={series} label={label} />
    </article>
  );
}

function ActionCard({ count, label, icon: Icon, onClick }: { count: number; label: string; icon: typeof Flag; onClick: () => void }) {
  return (
    <button className={`action-card ${count ? "urgent" : ""}`} onClick={onClick}>
      <span className="action-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span>
        <span className="action-count">{count}</span>
        <span className="action-label">{label}</span>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

export function OverviewPage({
  data,
  adminName,
  onNavigate,
  onRefresh,
}: {
  data: OverviewResponse;
  adminName: string;
  onNavigate: (tab: Tab) => void;
  onRefresh: () => void;
}) {
  const { stats, trends } = data;
  const waiting = [stats.pendingReports, stats.pendingVerifications, stats.stuckOrders, stats.pendingBroadcasts].filter(Boolean).length;
  const today = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" }).format(new Date());

  return (
    <div className="overview page">
      <header className="hero">
        <div>
          <p className="hero-eyebrow">
            <span className="live-dot" aria-hidden="true" />
            {today}
          </p>
          <h1 className="hero-title">
            {greeting()}, {adminName.split(" ")[0]}
          </h1>
          <p className="hero-summary">
            {waiting ? (
              <>
                <strong>
                  {waiting} {waiting === 1 ? "thing needs" : "things need"} you
                </strong>{" "}
                today. Everything else is running.
              </>
            ) : (
              "Nothing needs you right now. The community is running itself."
            )}
          </p>
        </div>
        <button className="refresh-button" onClick={onRefresh}>
          <RefreshCcw size={17} />
          Refresh
        </button>
      </header>

      <div className="action-grid">
        <ActionCard count={stats.pendingReports} label={stats.pendingReports === 1 ? "report to review" : "reports to review"} icon={Flag} onClick={() => onNavigate("reports")} />
        <ActionCard
          count={stats.pendingBroadcasts ?? 0}
          label={stats.pendingBroadcasts === 1 ? "partner update to approve" : "partner updates to approve"}
          icon={Megaphone}
          onClick={() => onNavigate("broadcasts")}
        />
        <ActionCard count={stats.pendingVerifications} label={stats.pendingVerifications === 1 ? "farmer to verify" : "farmers to verify"} icon={UserCheck} onClick={() => onNavigate("users")} />
        <ActionCard count={stats.stuckOrders} label={stats.stuckOrders === 1 ? "order stuck" : "orders stuck"} icon={AlertTriangle} onClick={() => onNavigate("orders")} />
      </div>

      <div className="kpi-grid">
        <Kpi label="New members this week" series={trends.members} />
        <Kpi label="Answers given this week" series={trends.answers} />
        <Kpi label="Posts shared this week" series={trends.posts} />
        <Kpi label="Orders this week" series={trends.orders} />
      </div>

      <div className="overview-columns">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Where people are joining</h2>
              <p className="muted">New members this week, by county</p>
            </div>
          </div>
          <BarList
            rows={data.growingCounties.map((row) => ({ label: row.county, value: row.count }))}
            emptyText="No new members with a county this week."
          />
          <button className="link-button" onClick={() => onNavigate("analytics")}>
            Regional analytics
          </button>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>What farmers are talking about</h2>
              <p className="muted">The busiest discussions right now</p>
            </div>
            <MessageSquare size={18} className="muted" />
          </div>
          <div className="stack">
            {data.topThreads.length ? (
              data.topThreads.map((thread) => (
                <div className="compact-row" key={thread._id}>
                  <div>
                    <strong>{thread.title}</strong>
                    <span>
                      {thread.category} · {thread.repliesCount} {thread.repliesCount === 1 ? "answer" : "answers"} · {formatNumber(thread.viewsCount)} views
                    </span>
                  </div>
                  {thread.isPinned ? <span className="pill amber">Pinned</span> : null}
                </div>
              ))
            ) : (
              <p className="empty">No discussions yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="overview-columns">
        <section className="card">
          <div className="card-head">
            <h2>Recent admin activity</h2>
            <button className="link-button" onClick={() => onNavigate("audit")}>
              Audit log
            </button>
          </div>
          {data.recentActions.length ? (
            <div className="timeline">
              {data.recentActions.map((entry) => (
                <div className="timeline-item" key={entry._id}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>
                      {describeAction(entry.action)}: {entry.summary}
                    </strong>
                    <span>
                      {entry.admin?.name ?? "Unknown admin"} · {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No admin actions yet.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Most liked posts</h2>
              <p className="muted">What the feed is responding to</p>
            </div>
          </div>
          <div className="stack">
            {data.topPosts.length ? (
              data.topPosts.map((post) => (
                <div className="compact-row" key={post._id}>
                  <div>
                    <strong>{post.headline}</strong>
                    <span>
                      {post.author?.name} · {post.likesCount} likes · {post.commentsCount} comments
                    </span>
                  </div>
                  {post.isPinned ? <span className="pill amber">Pinned</span> : null}
                </div>
              ))
            ) : (
              <p className="empty">No posts yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="totals-strip" aria-label="All-time totals">
        <span className="total-chip">
          <strong>{formatNumber(stats.totalUsers)}</strong> people
        </span>
        <span className="total-chip">
          <strong>{formatNumber(stats.activePosts)}</strong> live posts
        </span>
        <span className="total-chip">
          <strong>{formatNumber(stats.totalThreads)}</strong> discussions
        </span>
        <span className="total-chip">
          <strong>{formatNumber(stats.totalListings)}</strong> listings
        </span>
        <span className="total-chip">
          <strong>{formatNumber(stats.totalOrders)}</strong> orders
        </span>
        <span className="total-chip red">
          <strong>{formatNumber((stats.removedPosts ?? 0) + (stats.removedThreads ?? 0))}</strong> removed
        </span>
        <span className="total-chip red">
          <strong>{formatNumber(stats.suspendedUsers)}</strong> suspended
        </span>
      </div>
    </div>
  );
}
