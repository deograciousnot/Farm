import { useEffect, useMemo, useState } from "react";
import { Archive, Building2, Megaphone, Pencil, Plus, Send, Users } from "lucide-react";

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

const categories: { value: BroadcastCategory; label: string }[] = [
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
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
  { value: "organizations", label: "Organisations" },
] as const;

type View = (typeof views)[number]["value"];

const emptyDraft = (organization = ""): BroadcastInput => ({
  organization,
  title: "",
  body: "",
  category: "advisory",
  counties: [],
  roles: [],
  link: { label: "", url: "" },
  expiresAt: null,
});

function audienceLabel(broadcast: Pick<AdminBroadcast, "counties" | "roles">) {
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
          Publish verified advice, pest alerts, and programmes on behalf of ministries, counties, and other trusted organisations. Each broadcast goes to the
          counties and roles you choose: it notifies them and sits at the top of their Home feed.
        </p>
        {!editing ? (
          <button className="primary-button" onClick={() => setEditing({ input: emptyDraft(organizations[0]?._id) })} disabled={!organizations.length} title={organizations.length ? undefined : "Add an organisation first"}>
            <Plus size={16} />
            New broadcast
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
            setView(published ? "published" : "draft");
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
          emptyText={status === "published" ? "Nothing published yet." : status === "draft" ? "No drafts." : "Nothing archived."}
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
                  <strong>{broadcast.title}</strong>
                </div>
                <p>{broadcast.body}</p>
                <small className="muted">
                  {broadcast.organization?.name ?? "Deleted organisation"} · {audienceLabel(broadcast)}
                </small>
                <small className="muted">
                  {broadcast.status === "draft"
                    ? `Draft, last edited ${formatDate(broadcast.updatedAt)}`
                    : `Sent to ${formatNumber(broadcast.reach)} people · opened by ${formatNumber(broadcast.memberViews)}${openRate === null ? "" : ` (${openRate}%)`} · ${formatNumber(broadcast.views)} total views · ${formatDate(broadcast.publishedAt ?? undefined)}${broadcast.publishedBy ? ` by ${broadcast.publishedBy.name}` : ""}`}
                </small>
              </div>
              <div className="actions">
                {broadcast.status === "draft" ? (
                  <>
                    <button className="ghost" onClick={() => onEdit(broadcast)}>
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button
                      className="primary-button"
                      onClick={async () => {
                        const audience = await api.getAudience(broadcast.counties, broadcast.roles).catch(() => null);
                        confirm({
                          title: "Publish this broadcast?",
                          body: `It will notify ${audience ? formatNumber(audience.count) : "every matching"} ${audience?.count === 1 ? "person" : "people"} (${audienceLabel(broadcast)}). Published broadcasts can't be edited.`,
                          confirmLabel: "Publish",
                          tone: "primary",
                          onConfirm: async () => {
                            toast((await api.publishBroadcast(broadcast._id)).message);
                            await list.reload();
                          },
                        });
                      }}>
                      <Send size={16} />
                      Publish
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

function BroadcastComposer({
  id,
  initial,
  organizations,
  onDone,
}: {
  id?: string;
  initial: BroadcastInput;
  organizations: Organization[];
  onDone: (published: boolean) => void;
}) {
  const [input, setInput] = useState<BroadcastInput>(initial);
  const [countySearch, setCountySearch] = useState("");
  const [audience, setAudience] = useState<{ count: number; byRole: Record<string, number> } | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  // "All of Kenya" is a separate choice so unticking it doesn't silently mean nationwide.
  const [limitToCounties, setLimitToCounties] = useState(initial.counties.length > 0);
  const missingCounties = limitToCounties && input.counties.length === 0;

  const update = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) => setInput((current) => ({ ...current, [key]: value }));

  // Live audience size as targeting changes.
  useEffect(() => {
    const timeout = setTimeout(() => {
      api
        .getAudience(input.counties, input.roles)
        .then(setAudience)
        .catch(() => setAudience(null));
    }, 250);
    return () => clearTimeout(timeout);
  }, [input.counties, input.roles]);

  const visibleCounties = useMemo(
    () => COUNTIES.filter((county) => county.toLowerCase().includes(countySearch.trim().toLowerCase())),
    [countySearch]
  );

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save(publish: boolean) {
    setError("");
    if (!input.organization || !input.title.trim() || !input.body.trim()) {
      setError("Choose an organisation and add a title and message.");
      return;
    }
    if (missingCounties) {
      setError("Pick at least one county, or tick All of Kenya.");
      return;
    }

    const persist = async () => {
      setIsSaving(true);
      try {
        const saved = await api.saveBroadcast(input, id);
        if (publish) {
          toast((await api.publishBroadcast(saved.item._id)).message);
        } else {
          toast("Draft saved");
        }
        onDone(publish);
      } catch (saveError) {
        setError(errorMessage(saveError));
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    };

    if (!publish) {
      await persist().catch(() => {});
      return;
    }

    confirm({
      title: "Publish now?",
      body: `This notifies ${audience ? formatNumber(audience.count) : "every matching"} ${audience?.count === 1 ? "person" : "people"} straight away. Published broadcasts can't be edited.`,
      confirmLabel: "Publish",
      tone: "primary",
      onConfirm: persist,
    });
  }

  return (
    <section className="card composer">
      <div className="card-head">
        <h2>{id ? "Edit draft" : "New broadcast"}</h2>
      </div>
      <div className="composer-grid">
        <div className="composer-main">
          <div className="field-row">
            <label className="field">
              <span>Publish as</span>
              <select value={input.organization} onChange={(event) => update("organization", event.target.value)}>
                {organizations.map((organization) => (
                  <option key={organization._id} value={organization._id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
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
            <input value={input.title} onChange={(event) => update("title", event.target.value)} maxLength={120} placeholder="e.g. Fall armyworm spotted in Njoro and Molo" />
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
              <span>{missingCounties ? "Pick counties to see who's reached" : `${audience?.count === 1 ? "person" : "people"} will be notified`}</span>
            </div>
          </div>
          <fieldset className="field">
            <span>Who</span>
            <div className="check-row">
              {roleOptions.map((role) => (
                <label key={role.value} className="check">
                  <input type="checkbox" checked={input.roles.includes(role.value)} onChange={() => update("roles", toggle(input.roles, role.value))} />
                  {role.label}
                  {audience?.byRole[role.value] !== undefined ? <small className="muted"> {formatNumber(audience.byRole[role.value])}</small> : null}
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
        <button className="primary-button" onClick={() => void save(true)} disabled={isSaving || missingCounties || !audience?.count}>
          <Send size={16} />
          Publish to {missingCounties ? "…" : audience ? formatNumber(audience.count) : "…"}
        </button>
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
          <p>Only organisations you have verified can publish. Check who they are before adding them; their name appears with a verified badge.</p>
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
            <article className="moderation-row" key={organization._id}>
              <div className="row-main">
                <div className="row-title">
                  <Building2 size={16} className="muted" />
                  <strong>{organization.name}</strong>
                  <Pill>{organizationTypes.find((type) => type.value === organization.type)?.label}</Pill>
                </div>
                {organization.description ? <p>{organization.description}</p> : null}
                <small className="muted">
                  {organization.broadcasts} broadcasts · {formatNumber(organization.reach)} notifications sent{organization.website ? ` · ${organization.website}` : ""}
                </small>
              </div>
              <div className="actions">
                <button
                  className="ghost"
                  onClick={() =>
                    setForm({ id: organization._id, name: organization.name, type: organization.type, description: organization.description, website: organization.website })
                  }>
                  <Pencil size={16} />
                  Edit
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">No organisations yet. Add the first one to start publishing.</p>
        )}
      </div>
    </section>
  );
}
