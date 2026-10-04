import { useEffect, useState } from "react";
import { BadgeCheck, Flag, Phone, PhoneOff, Search, ShieldOff, UserCheck, UserX } from "lucide-react";

import { api } from "../api";
import { Avatar, ListState, LoadMore, Pill, errorMessage, formatDate, useConfirm, usePaged, useToast } from "../components";
import type { AdminUser } from "../types";

const views = [
  { value: "queue", label: "Verification queue" },
  { value: "all", label: "Everyone" },
  { value: "suspended", label: "Suspended" },
] as const;

type View = (typeof views)[number]["value"];

export function UsersPage({ onChanged }: { onChanged: () => void }) {
  const [view, setView] = useState<View>("queue");
  const [role, setRole] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  // Wait for typing to pause before searching.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const list = usePaged(
    (page) =>
      api.getUsers({
        page,
        search,
        role: view === "queue" ? undefined : role,
        verification: view === "queue" ? "queue" : undefined,
        status: view === "suspended" ? "suspended" : undefined,
      }),
    `${view}|${role}|${search}`
  );

  async function run(action: () => Promise<unknown>, success: string) {
    await action();
    toast(success);
    onChanged();
    await list.reload();
  }

  function verify(user: AdminUser) {
    confirm({
      title: `Verify ${user.name}?`,
      body: user.phone
        ? `Buyers will see a verified badge and can call ${user.phone} from listings. Only verify after you've confirmed who they are.`
        : "They have no phone number yet, so buyers won't be able to call them. Only verify after you've confirmed who they are.",
      confirmLabel: "Verify",
      tone: "primary",
      onConfirm: () => run(() => api.setVerification(user._id, "verified"), `${user.name} is verified`),
    });
  }

  function unverify(user: AdminUser) {
    confirm({
      title: `Remove ${user.name}'s verification?`,
      body: "Their badge disappears and their phone number is hidden from buyers.",
      confirmLabel: "Remove verification",
      onConfirm: () => run(() => api.setVerification(user._id, "unverified"), "Verification removed"),
    });
  }

  function suspend(user: AdminUser) {
    confirm({
      title: `Suspend ${user.name}?`,
      body: "They'll be signed out and blocked from signing in, and their listings will be hidden until you reinstate them.",
      confirmLabel: "Suspend",
      reason: "required",
      reasonPlaceholder: "e.g. Spam: posted the same ad 40 times",
      checkbox: { label: "Also remove everything they posted (posts, questions, answers, comments)" },
      onConfirm: async (reason, removeContent) => {
        const response = await api.setUserStatus(user._id, "suspended", reason, removeContent);
        toast(response.message);
        onChanged();
        await list.reload();
      },
    });
  }

  function reinstate(user: AdminUser) {
    void run(() => api.setUserStatus(user._id, "active"), `${user.name} reinstated`).catch((error) => toast(errorMessage(error), "error"));
  }

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>People</h2>
          <p>
            {view === "queue"
              ? `${list.total} farmers waiting for verification. Verified sellers get a badge and their phone shown to buyers.`
              : `${list.total} accounts.`}
          </p>
        </div>
        <div className="segmented" role="tablist">
          {views.map((option) => (
            <button key={option.value} role="tab" aria-selected={view === option.value} className={view === option.value ? "active" : ""} onClick={() => setView(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email, phone, or location" />
        </label>
        {view !== "queue" ? (
          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Role">
            <option value="all">All roles</option>
            <option value="farmer">Farmers</option>
            <option value="buyer">Buyers</option>
            <option value="hobbyist">Hobbyists</option>
          </select>
        ) : null}
      </div>

      <div className="table-list">
        <ListState
          isLoading={list.isLoading}
          error={list.error}
          isEmpty={!list.items.length}
          emptyText={view === "queue" ? "No one is waiting for verification." : "No accounts match."}
          onRetry={() => void list.reload()}
        />
        {list.items.map((user) => (
          <article className="user-row" key={user._id}>
            <Avatar name={user.name} url={user.avatarUrl} size={44} />
            <div className="row-main">
              <div className="row-title">
                <strong>{user.name}</strong>
                {user.verificationStatus !== "unverified" ? (
                  <Pill tone="green">
                    <BadgeCheck size={12} /> {user.verificationStatus === "top-rated" ? "Top rated" : "Verified"}
                  </Pill>
                ) : null}
                {user.accountStatus === "suspended" ? <Pill tone="red">Suspended</Pill> : null}
                {user.isAdmin ? <Pill tone="amber">Admin</Pill> : null}
                {user.pendingReports ? (
                  <Pill tone="red">
                    <Flag size={12} /> {user.pendingReports} reports
                  </Pill>
                ) : null}
              </div>
              <small className="muted">
                {user.email || user.phone} · <span className="capitalize">{user.role}</span> · {user.location} · joined {formatDate(user.createdAt)}
              </small>
              <div className="user-facts">
                <span className={user.phone ? "" : "warn"}>
                  {user.phone ? <Phone size={13} /> : <PhoneOff size={13} />} {user.phone || "No phone"}
                </span>
                <span>Trust {user.trustScore.toFixed(1)}</span>
                <span>{user.listingsCount} listings</span>
                <span>{user.completedSales} completed sales</span>
                <span>{user.followersCount} followers</span>
              </div>
              {user.bio ? <p>{user.bio}</p> : null}
              {user.accountStatus === "suspended" && user.suspendedReason ? <p className="form-error">Suspended: {user.suspendedReason}</p> : null}
            </div>
            <div className="actions">
              {user.verificationStatus === "unverified" ? (
                <button className="primary-button" onClick={() => verify(user)} disabled={user.accountStatus === "suspended"}>
                  <UserCheck size={16} />
                  Verify
                </button>
              ) : (
                <button className="ghost" onClick={() => unverify(user)}>
                  <ShieldOff size={16} />
                  Unverify
                </button>
              )}
              {user.accountStatus === "suspended" ? (
                <button className="ghost" onClick={() => reinstate(user)}>
                  Reinstate
                </button>
              ) : !user.isAdmin ? (
                <button className="danger-button" onClick={() => suspend(user)}>
                  <UserX size={16} />
                  Suspend
                </button>
              ) : null}
            </div>
          </article>
        ))}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}
