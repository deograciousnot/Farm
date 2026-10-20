import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, Megaphone, Pencil, Plus, Send, Trash2, Undo2, LogOut } from "lucide-react";

import { api } from "../api";
import { formatNumber } from "../charts";
import { Avatar, ListState, Pill, errorMessage, formatDate, useConfirm, useToast } from "../components";
import type { AdminBroadcast, BroadcastInput, PartnerSession } from "../types";
import { BroadcastComposer, audienceLabel, categories, emptyDraft } from "./BroadcastsPage";
import { SponsoredCredits } from "./SponsoredCredits";

type PartnerOrganization = PartnerSession["organizations"][number];

const tabs = [
  { key: "updates", label: "Updates", icon: Megaphone, title: "Your updates" },
  { key: "organisation", label: "Organisation", icon: Building2, title: "Your organisation" },
] as const;

type Tab = (typeof tabs)[number]["key"];

const statusPill: Record<AdminBroadcast["status"], { label: string; tone: "neutral" | "green" | "amber" | "red" }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "In review", tone: "amber" },
  rejected: { label: "Needs changes", tone: "red" },
  published: { label: "Live", tone: "green" },
  archived: { label: "Ended", tone: "neutral" },
};

/** The dashboard organisation staff see: their own updates and organisation, nothing else. */
export function PartnerApp({ session, onSignOut }: { session: PartnerSession; onSignOut: () => void }) {
  const [organizations, setOrganizations] = useState(session.organizations);
  const [organizationId, setOrganizationId] = useState(session.organizations[0]._id);
  const [tab, setTab] = useState<Tab>("updates");
  const organization = organizations.find((item) => item._id === organizationId) ?? organizations[0];

  // Credits and the weekly allowance change as updates are bought, submitted and published.
  const refreshOrganizations = useCallback(async () => {
    try {
      setOrganizations((await api.partner.getProfile()).organizations);
    } catch {
      // Keep showing the last known figures.
    }
  }, []);
  const current = tabs.find((item) => item.key === tab) ?? tabs[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark small">
              <Building2 size={21} />
            </div>
            <div>
              <strong>FarmConnect</strong>
              <span>Partners</span>
            </div>
          </div>
          {organizations.length > 1 ? (
            <label className="field org-switcher">
              <span>Organisation</span>
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                {organizations.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <nav>
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="nav-item">
                  <button className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)} aria-current={tab === item.key ? "page" : undefined}>
                    <Icon size={18} />
                    {item.label}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-account">
          <Avatar name={session.partner.name} url={session.partner.avatarUrl} size={34} />
          <div>
            <strong>{session.partner.name}</strong>
            <span>{organization.name}</span>
          </div>
          <button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <h1>{current.title}</h1>
        </header>
        <div className="page" key={`${tab}-${organization._id}`}>
          {tab === "updates" ? <UpdatesView organization={organization} organizations={organizations} onOrganizationChange={refreshOrganizations} /> : null}
          {tab === "organisation" ? <OrganisationView organization={organization} /> : null}
        </div>
      </section>
    </main>
  );
}

function UpdatesView({
  organization,
  organizations,
  onOrganizationChange,
}: {
  organization: PartnerOrganization;
  organizations: PartnerOrganization[];
  onOrganizationChange: () => void;
}) {
  const [items, setItems] = useState<AdminBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ id?: string; input: BroadcastInput } | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setItems((await api.partner.getBroadcasts(organization._id)).items);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [organization._id]);

  useEffect(() => {
    void load();
  }, [load]);

  const allowance = organization.weeklyAllowance;

  return (
    <div className="panel-grid">
      <section className="card intro-card">
        <Megaphone size={22} />
        <p>
          Write an update for the farmers you serve and choose which counties see it. FarmConnect reviews every update before it goes out, usually within a working
          day.{" "}
          {organization.sponsored
            ? "Your updates appear with a Sponsored label, below official alerts, and don't send notifications."
            : "Approved updates notify everyone you target."}
          {allowance ? ` This week: ${allowance.used} of ${allowance.limit} sponsored updates published.` : ""}
          {organization.sponsored ? " Sponsored updates are paid: buy credits below with M-Pesa." : ""}
        </p>
        {!editing ? (
          <button className="primary-button" onClick={() => setEditing({ input: emptyDraft(organization._id) })}>
            <Plus size={16} />
            New update
          </button>
        ) : null}
      </section>

      {organization.sponsored ? (
        <SponsoredCredits organizationId={organization._id} credits={organization.sponsoredCredits ?? 0} onChange={onOrganizationChange} />
      ) : null}

      {editing ? (
        <BroadcastComposer
          key={editing.id ?? "new"}
          id={editing.id}
          initial={editing.input}
          organizations={organizations.filter((item) => item._id === organization._id)}
          mode="partner"
          onDone={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}

      <section className="card">
        <div className="table-list">
          <ListState isLoading={isLoading} error={error} isEmpty={!items.length} emptyText="No updates yet. Write your first one above." onRetry={() => void load()} />
          {items.map((broadcast) => {
            const pill = statusPill[broadcast.status];
            const openRate = broadcast.reach ? Math.round((broadcast.memberViews / broadcast.reach) * 100) : null;
            const editable = broadcast.status === "draft" || broadcast.status === "rejected";

            return (
              <article className="moderation-row" key={broadcast._id}>
                <div className="row-main">
                  <div className="row-title">
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                    <Pill>{categories.find((category) => category.value === broadcast.category)?.label}</Pill>
                    <strong>{broadcast.title}</strong>
                  </div>
                  <p>{broadcast.body}</p>
                  {broadcast.status === "rejected" && broadcast.reviewNote ? (
                    <p className="notice">
                      <strong>What to change:</strong> {broadcast.reviewNote}
                    </p>
                  ) : null}
                  <small className="muted">{audienceLabel(broadcast)}</small>
                  <small className="muted">
                    {broadcast.status === "published" || broadcast.status === "archived"
                      ? `Shown to ${formatNumber(broadcast.reach)} people · opened by ${formatNumber(broadcast.memberViews)}${openRate === null ? "" : ` (${openRate}%)`} · ${formatDate(broadcast.publishedAt ?? undefined)}`
                      : broadcast.status === "pending"
                        ? `Submitted ${formatDate(broadcast.submittedAt ?? broadcast.updatedAt)}${broadcast.submittedBy ? ` by ${broadcast.submittedBy.name}` : ""}`
                        : `Last edited ${formatDate(broadcast.updatedAt)}`}
                  </small>
                </div>
                <div className="actions">
                  {editable ? (
                    <>
                      <button
                        className="ghost"
                        onClick={() =>
                          setEditing({
                            id: broadcast._id,
                            input: {
                              organization: organization._id,
                              title: broadcast.title,
                              body: broadcast.body,
                              category: broadcast.category,
                              counties: broadcast.counties,
                              roles: broadcast.roles,
                              link: broadcast.link ?? { label: "", url: "" },
                              expiresAt: broadcast.expiresAt ? broadcast.expiresAt.slice(0, 10) : null,
                            },
                          })
                        }>
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        className="ghost"
                        aria-label="Delete draft"
                        onClick={() =>
                          confirm({
                            title: "Delete this draft?",
                            confirmLabel: "Delete",
                            onConfirm: async () => {
                              toast((await api.partner.remove(broadcast._id)).message);
                              await load();
                            },
                          })
                        }>
                        <Trash2 size={16} />
                      </button>
                      <button
                        className="primary-button"
                        onClick={async () => {
                          try {
                            toast((await api.partner.submit(broadcast._id)).message);
                            await load();
                            onOrganizationChange();
                          } catch (submitError) {
                            toast(errorMessage(submitError), "error");
                          }
                        }}>
                        <Send size={16} />
                        Submit for review
                      </button>
                    </>
                  ) : null}
                  {broadcast.status === "pending" ? (
                    <button
                      className="ghost"
                      onClick={async () => {
                        try {
                          toast((await api.partner.withdraw(broadcast._id)).message);
                          await load();
                          onOrganizationChange();
                        } catch (withdrawError) {
                          toast(errorMessage(withdrawError), "error");
                        }
                      }}>
                      <Undo2 size={16} />
                      Withdraw to edit
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OrganisationView({ organization }: { organization: PartnerOrganization }) {
  const verified = organization.verification?.status === "verified";

  return (
    <div className="panel-grid">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>{organization.name}</h2>
            {organization.description ? <p>{organization.description}</p> : null}
          </div>
        </div>
        <div className="table-list">
          <article className="moderation-row">
            <div className="row-main">
              <div className="row-title">
                {verified ? <BadgeCheck size={18} className="muted" /> : null}
                <strong>{verified ? "Verified by FarmConnect" : "Not verified yet"}</strong>
              </div>
              <p>
                {verified
                  ? `FarmConnect checked: ${organization.verification.note}.${organization.verification.checkedAt ? ` (${formatDate(organization.verification.checkedAt)})` : ""} Farmers see this on your page, and your staff's listings carry a Verified supplier tag.`
                  : "FarmConnect verifies organisations after checking their registration documents. Until then your page shows no verified badge."}
              </p>
            </div>
          </article>
          {organization.weeklyAllowance ? (
            <article className="moderation-row">
              <div className="row-main">
                <strong>Sponsored updates this week</strong>
                <p>
                  {organization.weeklyAllowance.used} of {organization.weeklyAllowance.limit} used. The limit keeps farmers&apos; feeds useful, which keeps them reading
                  your updates.
                </p>
              </div>
            </article>
          ) : null}
          <article className="moderation-row">
            <div className="row-main">
              <strong>Details and staff</strong>
              <p>To change your organisation&apos;s details or give a colleague access, contact FarmConnect.{organization.website ? ` Website: ${organization.website}` : ""}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
