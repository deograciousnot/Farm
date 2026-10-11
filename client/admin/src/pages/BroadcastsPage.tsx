import { useEffect, useMemo, useState } from "react";
import { Archive, BadgeCheck, Building2, Megaphone, Pencil, Plus, Send, Undo2, UserMinus, UserPlus, Users } from "lucide-react";

import { api } from "../api";
import { formatNumber } from "../charts";
import { ListState, LoadMore, Pill, errorMessage, formatDate, useConfirm, usePaged, useToast } from "../components";
import type { AdminBroadcast, BroadcastCategory, BroadcastInput, Organization, OrganizationType } from "../types";

// Keep in step with KENYA_COUNTIES in server/utils/regions.js.
const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
  "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
  "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

export const categories: { value: BroadcastCategory; label: string }[] = [
  { value: "advisory", label: "Advisory" },
  { value: "pest-alert", label: "Pest alert" },
  { value: "weather", label: "Weather" },
  { value: "market", label: "Market" },
  { value: "program", label: "Programme" },
  { value: "training", label: "Training" },
];

const organizationTypes: { value: OrganizationType; label: string }[] = [
  { value: "government", label: "National government" },
  { value: "county", label: "County government" },
  { value: "research", label: "Research institute" },
  { value: "ngo", label: "NGO" },
  { value: "cooperative", label: "Cooperative" },
  { value: "company", label: "Company" },
  { value: "other", label: "Other" },
];

const roleOptions = [
  { value: "farmer", label: "Farmers" },
  { value: "buyer", label: "Buyers" },
  { value: "hobbyist", label: "Hobbyists" },
];

const views = [
  { value: "pending", label: "To review" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "rejected", label: "Sent back" },
  { value: "archived", label: "Archived" },
  { value: "organizations", label: "Organisations" },
] as const;

type View = (typeof views)[number]["value"];

export const emptyDraft = (organization = ""): BroadcastInput => ({
  organization,
  title: "",
  body: "",
  category: "advisory",
  counties: [],
  roles: [],
  link: { label: "", url: "" },
  expiresAt: null,
});

export function audienceLabel(broadcast: Pick<AdminBroadcast, "counties" | "roles">) {
  const who = broadcast.roles.length ? broadcast.roles.map((role) => `${role}s`).join(" & ") : "Everyone";
  const where = broadcast.counties.length ? broadcast.counties.join(", ") : "all counties";
  return `${who} in ${where}`;
}

export function BroadcastsPage() {
  const [view, setView] = useState<View>("published");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [editing, setEditing] = useState<{ id?: string; input: BroadcastInput } | null>(null);
  const toast = useToast();

  async function loadOrganizations() {
    try {
      setOrganizations((await api.getOrganizations()).items);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  useEffect(() => {
    void loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="panel-grid">
      <section className="card intro-card">
        <Megaphone size={22} />
        <p>
          Publish advice, pest alerts, and programmes for ministries, counties and other public bodies: these notify everyone you target. Updates from
          companies are always labelled Sponsored, never notify anyone, sit below official alerts, and are limited to 2 a week. Organisation staff can
          submit updates for you to review under To review.
        </p>
        {!editing ? (
          <button className="primary-button" onClick={() => setEditing({ input: emptyDraft(organizations[0]?._id) })} disabled={!organizations.length} title={organizations.length ? undefined : "Add an organisation first"}>
            <Plus size={16} />
            New update
          </button>
        ) : null}
      </section>

      {editing ? (
        <BroadcastComposer
          key={editing.id ?? "new"}
          id={editing.id}
          initial={editing.input}
          organizations={organizations}
          onDone={(published) => {
            setEditing(null);
            setView(published ? "published" : editing.id && view === "pending" ? "pending" : "draft");
          }}
        />
      ) : null}

      <div className="segmented" role="tablist">
        {views.map((option) => (
          <button key={option.value} role="tab" aria-selected={view === option.value} className={view === option.value ? "active" : ""} onClick={() => setView(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {view === "organizations" ? (
        <OrganizationsPanel organizations={organizations} onChanged={() => void loadOrganizations()} />
      ) : (
        <BroadcastList
          status={view}
          onEdit={(broadcast) =>
            setEditing({
              id: broadcast._id,
              input: {
                organization: broadcast.organization?._id ?? "",
                title: broadcast.title,
                body: broadcast.body,
                category: broadcast.category,
                counties: broadcast.counties,
                roles: broadcast.roles,
                link: broadcast.link ?? { label: "", url: "" },
                expiresAt: broadcast.expiresAt ? broadcast.expiresAt.slice(0, 10) : null,
              },
            })
          }
        />
      )}
    </div>
  );
}

function BroadcastList({ status, onEdit }: { status: Exclude<View, "organizations">; onEdit: (broadcast: AdminBroadcast) => void }) {
  const list = usePaged((page) => api.getBroadcasts({ page, status }), status);
  const confirm = useConfirm();
  const toast = useToast();

  return (
    <section className="card">
      <div className="table-list">
        <ListState
          isLoading={list.isLoading}
          error={list.error}
          isEmpty={!list.items.length}
          emptyText={
            status === "pending"
              ? "Nothing waiting for review."
              : status === "published"
                ? "Nothing published yet."
                : status === "draft"
                  ? "No drafts."
                  : status === "rejected"
                    ? "Nothing sent back."
                    : "Nothing archived."
          }
          onRetry={() => void list.reload()}
        />
        {list.items.map((broadcast) => {
          const openRate = broadcast.reach ? Math.round((broadcast.memberViews / broadcast.reach) * 100) : null;

          return (
            <article className="moderation-row" key={broadcast._id}>
              <div className="row-main">
                <div className="row-title">
                  <Pill tone={broadcast.category === "pest-alert" ? "red" : broadcast.category === "weather" || broadcast.category === "market" ? "amber" : "green"}>
                    {categories.find((category) => category.value === broadcast.category)?.label}
                  </Pill>
                  {broadcast.kind === "sponsored" ? <Pill tone="amber">Sponsored</Pill> : null}
                  <strong>{broadcast.title}</strong>
                </div>
                <p>{broadcast.body}</p>
                <small className="muted">
                  {broadcast.organization?.name ?? "Deleted organisation"} · {audienceLabel(broadcast)}
                </small>
                <small className="muted">
                  {broadcast.status === "draft"
                    ? `Draft, last edited ${formatDate(broadcast.updatedAt)}`
                    : broadcast.status === "pending"
                      ? `Submitted by ${broadcast.submittedBy?.name ?? "a partner"} · ${formatDate(broadcast.submittedAt ?? broadcast.updatedAt)}`
                      : broadcast.status === "rejected"
                        ? `Sent back: ${broadcast.reviewNote}`
                    : `Sent to ${formatNumber(broadcast.reach)} people · opened by ${formatNumber(broadcast.memberViews)}${openRate === null ? "" : ` (${openRate}%)`} · ${formatNumber(broadcast.views)} total views · ${formatDate(broadcast.publishedAt ?? undefined)}${broadcast.publishedBy ? ` by ${broadcast.publishedBy.name}` : ""}`}
                </small>
              </div>
              <div className="actions">
                {broadcast.status === "pending" ? (
                  <button
                    className="ghost"
                    onClick={() =>
                      confirm({
                        title: "Send this back?",
                        body: `${broadcast.submittedBy?.name ?? "The partner"} gets your note by email and in the app, and can fix it and submit again.`,
                        confirmLabel: "Send back",
                        reason: "required",
                        reasonPlaceholder: "What should they change? e.g. Add the price per 50kg bag.",
                        onConfirm: async (reason) => {
                          toast((await api.rejectBroadcast(broadcast._id, reason)).message);
                          await list.reload();
                        },
                      })
                    }>
                    <Undo2 size={16} />
                    Send back
                  </button>
                ) : null}
                {broadcast.status === "draft" || broadcast.status === "pending" ? (
                  <>
                    <button className="ghost" onClick={() => onEdit(broadcast)}>
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button
                      className="primary-button"
                      onClick={async () => {
                        const audience = await api.getAudience(broadcast.counties, broadcast.roles).catch(() => null);
                        const who = `${audience ? formatNumber(audience.count) : "every matching"} ${audience?.count === 1 ? "person" : "people"} (${audienceLabel(broadcast)})`;
                        confirm({
                          title: broadcast.kind === "sponsored" ? "Publish this sponsored update?" : "Publish this broadcast?",
                          body:
                            broadcast.kind === "sponsored"
                              ? `It will appear in the feed of ${who} with a Sponsored label. It won't notify anyone. Published updates can't be edited.`
                              : `It will notify ${who}. Published broadcasts can't be edited.`,
                          confirmLabel: "Publish",
                          tone: "primary",
                          onConfirm: async () => {
                            toast((await api.publishBroadcast(broadcast._id)).message);
                            await list.reload();
                          },
                        });
                      }}>
                      <Send size={16} />
                      {broadcast.status === "pending" ? "Approve & publish" : "Publish"}
                    </button>
                  </>
                ) : null}
                {broadcast.status === "published" ? (
                  <button
                    className="ghost"
                    onClick={() =>
                      confirm({
                        title: "Archive this broadcast?",
                        body: "It disappears from people's feeds. Notifications already sent stay in their inbox.",
                        confirmLabel: "Archive",
                        onConfirm: async () => {
                          toast((await api.archiveBroadcast(broadcast._id)).message);
                          await list.reload();
                        },
                      })
                    }>
                    <Archive size={16} />
                    Archive
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}

type ComposerOrganization = Pick<Organization, "_id" | "name" | "type">;

/** Writes an update. Admins publish directly; partners save drafts and submit them for review. */
export function BroadcastComposer({
  id,
  initial,
  organizations,
  mode = "admin",
  onDone,
}: {
  id?: string;
  initial: BroadcastInput;
  organizations: ComposerOrganization[];
  mode?: "admin" | "partner";
  onDone: (published: boolean) => void;
}) {
  const [input, setInput] = useState<BroadcastInput>(initial);
  const [countySearch, setCountySearch] = useState("");
  const [audience, setAudience] = useState<{ count: number; byRole?: Record<string, number> } | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  // "All of Kenya" is a separate choice so unticking it doesn't silently mean nationwide.
  const [limitToCounties, setLimitToCounties] = useState(initial.counties.length > 0);
  const missingCounties = limitToCounties && input.counties.length === 0;
  const isPartner = mode === "partner";
  const sponsored = organizations.find((organization) => organization._id === input.organization)?.type === "company";

  const update = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) => setInput((current) => ({ ...current, [key]: value }));

  // Live audience size as targeting changes.
  useEffect(() => {
    const timeout = setTimeout(() => {
      (isPartner ? api.partner.getAudience(input.organization, input.counties, input.roles) : api.getAudience(input.counties, input.roles))
        .then(setAudience)
        .catch(() => setAudience(null));
    }, 250);
    return () => clearTimeout(timeout);
  }, [input.organization, input.counties, input.roles, isPartner]);

  const visibleCounties = useMemo(
    () => COUNTIES.filter((county) => county.toLowerCase().includes(countySearch.trim().toLowerCase())),
    [countySearch]
  );

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save(send: boolean) {
    setError("");
    if (!input.organization || !input.title.trim() || !input.body.trim()) {
      setError("Add a title and a message.");
      return;
    }
    if (missingCounties) {
      setError("Pick at least one county, or tick All of Kenya.");
      return;
    }

    const persist = async () => {
      setIsSaving(true);
      try {
        if (isPartner) {
          const saved = await api.partner.saveBroadcast(input, id);
          toast(send ? (await api.partner.submit(saved.item._id)).message : "Draft saved");
        } else {
          const saved = await api.saveBroadcast(input, id);
          toast(send ? (await api.publishBroadcast(saved.item._id)).message : "Draft saved");
        }
        onDone(send);
      } catch (saveError) {
        setError(errorMessage(saveError));
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    };

    if (!send || isPartner) {
      await persist().catch(() => {});
      return;
    }

    const who = `${audience ? formatNumber(audience.count) : "every matching"} ${audience?.count === 1 ? "person" : "people"}`;
    confirm({
      title: "Publish now?",
      body: sponsored
        ? `This appears in the feed of ${who} with a Sponsored label. It won't notify anyone. Published updates can't be edited.`
        : `This notifies ${who} straight away. Published broadcasts can't be edited.`,
      confirmLabel: "Publish",
      tone: "primary",
      onConfirm: persist,
    });
  }

  return (
    <section className="card composer">
      <div className="card-head">
        <h2>{id ? "Edit update" : "New update"}</h2>
      </div>
      {sponsored ? (
        <p className="notice">
          <strong>Sponsored.</strong> Shown with a Sponsored label, below official alerts, to the people you choose. It doesn&apos;t send notifications. Each
          company can publish 2 a week{isPartner ? ", and FarmConnect reviews every update before it goes out" : ""}.
        </p>
      ) : null}
      <div className="composer-grid">
        <div className="composer-main">
          <div className="field-row">
            {organizations.length > 1 || !isPartner ? (
              <label className="field">
                <span>Publish as</span>
                <select value={input.organization} onChange={(event) => update("organization", event.target.value)}>
                  {organizations.map((organization) => (
                    <option key={organization._id} value={organization._id}>
                      {organization.name}
                      {organization.type === "company" ? " (sponsored)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>Type</span>
              <select value={input.category} onChange={(event) => update("category", event.target.value as BroadcastCategory)}>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Title</span>
            <input
              value={input.title}
              onChange={(event) => update("title", event.target.value)}
              maxLength={120}
              placeholder={sponsored ? "e.g. DAP fertiliser in stock at our Nakuru depot" : "e.g. Fall armyworm spotted in Njoro and Molo"}
            />
          </label>
          <label className="field">
            <span>
              Message <small className="muted">{input.body.length}/3000</small>
            </span>
            <textarea
              value={input.body}
              onChange={(event) => update("body", event.target.value)}
              maxLength={3000}
              rows={7}
              placeholder="What should farmers know or do? Keep it practical: what, where, and the next step."
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Link label (optional)</span>
              <input value={input.link.label} onChange={(event) => update("link", { ...input.link, label: event.target.value })} placeholder="Learn more" />
            </label>
            <label className="field">
              <span>Link URL (optional)</span>
              <input value={input.link.url} onChange={(event) => update("link", { ...input.link, url: event.target.value })} placeholder="https://" />
            </label>
            <label className="field">
              <span>Stop showing after (optional)</span>
              <input type="date" value={input.expiresAt ?? ""} onChange={(event) => update("expiresAt", event.target.value || null)} />
            </label>
          </div>
        </div>

        <aside className="composer-audience">
          <div className="audience-count">
            <Users size={18} />
            <div>
              <strong>{missingCounties ? "—" : audience ? formatNumber(audience.count) : "—"}</strong>
              <span>
                {missingCounties
                  ? "Pick counties to see who's reached"
                  : `${audience?.count === 1 ? "person" : "people"} ${sponsored ? "will see it in their feed" : "will be notified"}`}
              </span>
            </div>
          </div>
          <fieldset className="field">
            <span>Who</span>
            <div className="check-row">
              {roleOptions.map((role) => (
                <label key={role.value} className="check">
                  <input type="checkbox" checked={input.roles.includes(role.value)} onChange={() => update("roles", toggle(input.roles, role.value))} />
                  {role.label}
                  {audience?.byRole?.[role.value] !== undefined ? <small className="muted"> {formatNumber(audience.byRole[role.value])}</small> : null}
                </label>
              ))}
            </div>
            <small className="muted">{input.roles.length ? "" : "None ticked means everyone."}</small>
          </fieldset>
          <fieldset className="field">
            <span>Where</span>
            <label className="check">
              <input
                type="checkbox"
                checked={!limitToCounties}
                onChange={() => {
                  setLimitToCounties((current) => !current);
                  update("counties", []);
                }}
              />
              All of Kenya
            </label>
            {limitToCounties ? (
              <>
                <input className="county-search" value={countySearch} onChange={(event) => setCountySearch(event.target.value)} placeholder="Search counties" />
                <div className="county-grid">
                  {visibleCounties.map((county) => (
                    <label key={county} className="check">
                      <input type="checkbox" checked={input.counties.includes(county)} onChange={() => update("counties", toggle(input.counties, county))} />
                      {county}
                    </label>
                  ))}
                </div>
                <small className="muted">{input.counties.length} selected</small>
              </>
            ) : null}
          </fieldset>
        </aside>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="dialog-actions">
        <button className="ghost" onClick={() => onDone(false)} disabled={isSaving}>
          Cancel
        </button>
        <button className="ghost" onClick={() => void save(false)} disabled={isSaving}>
          Save draft
        </button>
        {isPartner ? (
          <button className="primary-button" onClick={() => void save(true)} disabled={isSaving || missingCounties}>
            <Send size={16} />
            Submit for review
          </button>
        ) : (
          <button className="primary-button" onClick={() => void save(true)} disabled={isSaving || missingCounties || !audience?.count}>
            <Send size={16} />
            Publish to {missingCounties ? "…" : audience ? formatNumber(audience.count) : "…"}
          </button>
        )}
      </div>
    </section>
  );
}

function OrganizationsPanel({ organizations, onChanged }: { organizations: Organization[]; onChanged: () => void }) {
  const [form, setForm] = useState<{ id?: string; name: string; type: OrganizationType; description: string; website: string } | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();

  async function save() {
    if (!form) return;
    setError("");
    try {
      const { id, ...input } = form;
      toast((await api.saveOrganization(input, id)).message);
      setForm(null);
      onChanged();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Organisations</h2>
          <p>
            Check who an organisation is before verifying it: farmers see the verified badge and what you checked. Add their staff by email so they can submit
            updates from the partner dashboard. Companies&apos; updates are always sponsored.
          </p>
        </div>
        {!form ? (
          <button className="primary-button" onClick={() => setForm({ name: "", type: "government", description: "", website: "" })}>
            <Plus size={16} />
            Add organisation
          </button>
        ) : null}
      </div>

      {form ? (
        <div className="composer org-form">
          <div className="field-row">
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. KALRO" autoFocus />
            </label>
            <label className="field">
              <span>Type</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as OrganizationType })}>
                {organizationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Website</span>
              <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://" />
            </label>
          </div>
          <label className="field">
            <span>About (shown to farmers)</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            <button className="ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button className="primary-button" onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="table-list">
        {organizations.length ? (
          organizations.map((organization) => (
            <OrganizationRow
              key={organization._id}
              organization={organization}
              onEdit={() =>
                setForm({ id: organization._id, name: organization.name, type: organization.type, description: organization.description, website: organization.website })
              }
              onChanged={onChanged}
            />
          ))
        ) : (
          <p className="empty">No organisations yet. Add the first one to start publishing.</p>
        )}
      </div>
    </section>
  );
}

function OrganizationRow({ organization, onEdit, onChanged }: { organization: Organization; onEdit: () => void; onChanged: () => void }) {
  const [memberEmail, setMemberEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const verified = organization.verification?.status === "verified";

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!memberEmail.trim()) return;
    setIsAdding(true);
    try {
      toast((await api.addOrganizationMember(organization._id, memberEmail.trim())).message);
      setMemberEmail("");
      onChanged();
    } catch (addError) {
      toast(errorMessage(addError), "error");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className="moderation-row org-row">
      <div className="row-main">
        <div className="row-title">
          <Building2 size={16} className="muted" />
          <strong>{organization.name}</strong>
          <Pill>{organizationTypes.find((type) => type.value === organization.type)?.label}</Pill>
          {verified ? <Pill tone="green">Verified</Pill> : <Pill tone="amber">Not verified</Pill>}
          {organization.type === "company" ? <Pill tone="amber">Sponsored</Pill> : null}
        </div>
        {organization.description ? <p>{organization.description}</p> : null}
        {verified ? (
          <small className="muted">
            Checked: {organization.verification.note}
            {organization.verification.checkedAt ? ` · ${formatDate(organization.verification.checkedAt)}` : ""}
          </small>
        ) : null}
        <small className="muted">
          {organization.broadcasts} updates · {formatNumber(organization.reach)} people reached{organization.website ? ` · ${organization.website}` : ""}
        </small>

        <div className="member-list">
          <span className="member-heading">Staff who can submit updates</span>
          {organization.members.length ? (
            organization.members.map((member) => (
              <div className="member" key={member.user._id}>
                <span>
                  {member.user.name}
                  {member.user.email ? <small className="muted"> · {member.user.email}</small> : null}
                </span>
                <button
                  className="ghost small"
                  aria-label={`Remove ${member.user.name}`}
                  onClick={() =>
                    confirm({
                      title: `Remove ${member.user.name}?`,
                      body: `They will no longer be able to submit updates for ${organization.name}. Their FarmConnect account stays.`,
                      confirmLabel: "Remove",
                      onConfirm: async () => {
                        toast((await api.removeOrganizationMember(organization._id, member.user._id)).message);
                        onChanged();
                      },
                    })
                  }>
                  <UserMinus size={15} />
                  Remove
                </button>
              </div>
            ))
          ) : (
            <small className="muted">Nobody yet.</small>
          )}
          <form className="member-add" onSubmit={addMember}>
            <input
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="Their FarmConnect account email"
              aria-label={`Add staff to ${organization.name}`}
            />
            <button className="ghost" type="submit" disabled={isAdding || !memberEmail.trim()}>
              <UserPlus size={15} />
              Add
            </button>
          </form>
        </div>
      </div>
      <div className="actions">
        <button className="ghost" onClick={onEdit}>
          <Pencil size={16} />
          Edit
        </button>
        {verified ? (
          <button
            className="ghost"
            onClick={() =>
              confirm({
                title: `Remove verification from ${organization.name}?`,
                body: "Farmers will no longer see the verified badge, and staff listings lose the Verified supplier tag.",
                confirmLabel: "Remove verification",
                onConfirm: async () => {
                  toast((await api.setOrganizationVerification(organization._id, "unverified")).message);
                  onChanged();
                },
              })
            }>
            Unverify
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={() =>
              confirm({
                title: `Verify ${organization.name}?`,
                body: "Say what you checked. Farmers see this on the organisation's page, so only claim what you actually saw.",
                confirmLabel: "Verify",
                tone: "primary",
                reason: "required",
                reasonPlaceholder: "e.g. Business registration and fertiliser dealer licence",
                onConfirm: async (note) => {
                  toast((await api.setOrganizationVerification(organization._id, "verified", note)).message);
                  onChanged();
                },
              })
            }>
            <BadgeCheck size={16} />
            Verify
          </button>
        )}
      </div>
    </article>
  );
}
