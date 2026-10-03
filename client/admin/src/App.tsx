import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bell, Flag, History, LayoutDashboard, Loader2, LogOut, Megaphone, MessageSquare, Newspaper, Package, RefreshCcw, Receipt, Shield, Users } from "lucide-react";

import { api, setUnauthorizedHandler, tokenStore } from "./api";
import { Avatar, ConfirmProvider, ToastProvider, errorMessage } from "./components";
import { AuditPage, FeedPage, NotificationsPage, ThreadsPage } from "./pages/ContentPages";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BroadcastsPage } from "./pages/BroadcastsPage";
import { LoginPage } from "./pages/LoginPage";
import { ListingsPage, OrdersPage } from "./pages/MarketPages";
import { OverviewPage } from "./pages/OverviewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import type { AdminProfile, OverviewResponse } from "./types";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, title: "Today", group: "Insights" },
  { key: "analytics", label: "Analytics", icon: BarChart3, title: "Analytics", group: "Insights" },
  { key: "broadcasts", label: "Broadcasts", icon: Megaphone, title: "Official broadcasts", group: "Outreach" },
  { key: "reports", label: "Reports", icon: Flag, title: "Reports", group: "Trust & safety" },
  { key: "users", label: "People", icon: Users, title: "People & verification", group: "Trust & safety" },
  { key: "listings", label: "Listings", icon: Package, title: "Listings", group: "Marketplace" },
  { key: "orders", label: "Orders", icon: Receipt, title: "Orders", group: "Marketplace" },
  { key: "feed", label: "Feed", icon: Newspaper, title: "Feed", group: "Content" },
  { key: "threads", label: "Community", icon: MessageSquare, title: "Community", group: "Content" },
  { key: "notifications", label: "Notifications", icon: Bell, title: "Notifications", group: "Content" },
  { key: "audit", label: "Audit log", icon: History, title: "Audit log", group: "Content" },
] as const;

type Tab = (typeof tabs)[number]["key"];

function tabFromHash(): Tab {
  const hash = window.location.hash.replace("#", "");
  return tabs.some((tab) => tab.key === hash) ? (hash as Tab) : "overview";
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminApp />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AdminApp() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isRestoring, setIsRestoring] = useState(Boolean(tokenStore.get()));
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [overviewError, setOverviewError] = useState("");

  const signOut = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
    setOverview(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore an existing session on load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then(({ admin: profile }) => setAdmin(profile))
      .catch(() => tokenStore.clear())
      .finally(() => setIsRestoring(false));
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewError("");
      setOverview(await api.getOverview());
    } catch (error) {
      setOverviewError(errorMessage(error, "Couldn't load the overview."));
    }
  }, []);

  useEffect(() => {
    if (admin) void loadOverview();
  }, [admin, loadOverview]);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(next: Tab) {
    window.location.hash = next;
    setTab(next);
  }

  if (isRestoring) {
    return (
      <main className="gate">
        <Loader2 className="spin" />
      </main>
    );
  }

  if (!admin) {
    return <LoginPage onSignedIn={setAdmin} />;
  }

  const current = tabs.find((item) => item.key === tab) ?? tabs[0];
  const badges: Partial<Record<Tab, number>> = {
    reports: overview?.stats.pendingReports,
    users: overview?.stats.pendingVerifications,
    orders: overview?.stats.stuckOrders,
  };

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
            {tabs.map((item, index) => {
              const Icon = item.icon;
              const badge = badges[item.key];
              const startsGroup = index === 0 || tabs[index - 1].group !== item.group;
              return (
                <div key={item.key} className="nav-item">
                  {startsGroup ? <span className="nav-group">{item.group}</span> : null}
                  <button className={tab === item.key ? "active" : ""} onClick={() => navigate(item.key)} aria-current={tab === item.key ? "page" : undefined}>
                    <Icon size={18} />
                    {item.label}
                    {badge ? <span className="nav-badge">{badge}</span> : null}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-account">
          <Avatar name={admin.name} url={admin.avatarUrl} size={34} />
          <div>
            <strong>{admin.name}</strong>
            <span>{admin.email}</span>
          </div>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <h1>{current.title}</h1>
          {tab === "overview" ? (
            <button className="refresh-button" onClick={() => void loadOverview()}>
              <RefreshCcw size={17} />
              Refresh
            </button>
          ) : null}
        </header>

        {tab === "overview" ? (
          overview ? (
            <OverviewPage data={overview} onNavigate={navigate} />
          ) : overviewError ? (
            <div className="error-banner">{overviewError}</div>
          ) : (
            <div className="loading-state">
              <Loader2 className="spin" size={18} /> Loading…
            </div>
          )
        ) : null}
        {tab === "analytics" ? <AnalyticsPage /> : null}
        {tab === "broadcasts" ? <BroadcastsPage /> : null}
        {tab === "listings" ? <ListingsPage onChanged={() => void loadOverview()} /> : null}
        {tab === "orders" ? <OrdersPage onChanged={() => void loadOverview()} /> : null}
        {tab === "reports" ? <ReportsPage onChanged={() => void loadOverview()} /> : null}
        {tab === "users" ? <UsersPage onChanged={() => void loadOverview()} /> : null}
        {tab === "feed" ? <FeedPage onChanged={() => void loadOverview()} /> : null}
        {tab === "threads" ? <ThreadsPage onChanged={() => void loadOverview()} /> : null}
        {tab === "notifications" ? <NotificationsPage /> : null}
        {tab === "audit" ? <AuditPage /> : null}
      </section>
    </main>
  );
}
