import { useState } from "react";
import { CheckCircle2, EyeOff, RotateCcw, UserX, XCircle } from "lucide-react";

import { api } from "../api";
import { ListState, LoadMore, Pill, errorMessage, formatDate, useConfirm, usePaged, useToast } from "../components";
import type { ModeratableType, Report } from "../types";

const statusFilters = [
  { value: "pending", label: "Needs review" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
] as const;

const typeLabels: Record<Report["targetType"], string> = {
  post: "Post",
  comment: "Comment",
  thread: "Discussion",
  reply: "Answer",
  product: "Listing",
  user: "Account",
};

export function ReportsPage({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<(typeof statusFilters)[number]["value"]>("pending");
  const list = usePaged((page) => api.getReports({ status, page }), status);
  const confirm = useConfirm();
  const toast = useToast();

  async function run(action: () => Promise<unknown>, success: string) {
    await action();
    toast(success);
    onChanged();
    await list.reload();
  }

  function takeAction(report: Report) {
    const isUser = report.targetType === "user";
    confirm({
      title: isUser ? `Suspend ${report.preview.title}?` : `Remove this ${typeLabels[report.targetType].toLowerCase()}?`,
      body: isUser
        ? "They won't be able to sign in, and their listings will be hidden until you reinstate them."
        : "It will disappear from the app and the author will be notified with your reason. You can restore it later.",
      confirmLabel: isUser ? "Suspend account" : "Remove",
      reason: "required",
      onConfirm: (reason) => run(() => api.actOnReport(report._id, reason), isUser ? "Account suspended" : "Content removed"),
    });
  }

  function restore(report: Report) {
    confirm({
      title: "Restore this content?",
      body: "It will be visible in the app again.",
      confirmLabel: "Restore",
      tone: "primary",
      onConfirm: () => run(() => api.moderate(report.targetType as ModeratableType, report.target, "active"), "Content restored"),
    });
  }

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Reports</h2>
          <p>
            {list.total} {status === "pending" ? "waiting for review" : "reports"}. Each shows exactly what was reported.
          </p>
        </div>
        <div className="segmented" role="tablist">
          {statusFilters.map((filter) => (
            <button key={filter.value} role="tab" aria-selected={status === filter.value} className={status === filter.value ? "active" : ""} onClick={() => setStatus(filter.value)}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-list">
        <ListState
          isLoading={list.isLoading}
          error={list.error}
          isEmpty={!list.items.length}
          emptyText={status === "pending" ? "Nothing to review. Nice." : "No reports here."}
          onRetry={() => void list.reload()}
        />
        {list.items.map((report) => (
          <article className="report-card" key={report._id}>
            <header className="row-title">
              <Pill tone="red">{typeLabels[report.targetType]}</Pill>
              <strong>{report.reason}</strong>
              {report.status !== "pending" ? <Pill capitalize>{report.status}</Pill> : null}
            </header>
            {report.note ? <p className="report-note">“{report.note}”</p> : null}
            <small className="muted">
              Reported by {report.reporter?.name ?? "a deleted account"} · {formatDate(report.createdAt)}
            </small>

            <blockquote className={`report-target ${report.preview.status}`}>
              <div className="row-title">
                <strong>{report.preview.title}</strong>
                {report.preview.status === "removed" ? <Pill tone="red">Removed</Pill> : null}
                {report.preview.status === "suspended" ? <Pill tone="red">Suspended</Pill> : null}
                {report.preview.status === "missing" ? <Pill>Deleted</Pill> : null}
              </div>
              {report.preview.context ? <small className="muted">{report.preview.context}</small> : null}
              {report.preview.body ? <p>{report.preview.body}</p> : null}
              {report.preview.author ? (
                <small className="muted">
                  By {report.preview.author.name}
                  {report.preview.author.email ? ` · ${report.preview.author.email}` : ""}
                </small>
              ) : null}
            </blockquote>

            <div className="actions">
              {report.status === "pending" && report.preview.status === "active" ? (
                <button className="danger-button" onClick={() => takeAction(report)}>
                  {report.targetType === "user" ? <UserX size={16} /> : <EyeOff size={16} />}
                  {report.targetType === "user" ? "Suspend account" : "Remove"}
                </button>
              ) : null}
              {report.status === "pending" ? (
                <>
                  <button className="ghost" onClick={() => void run(() => api.updateReport(report._id, "reviewed"), "Marked as reviewed").catch((e) => toast(errorMessage(e), "error"))}>
                    <CheckCircle2 size={16} />
                    Looks fine
                  </button>
                  <button className="ghost" onClick={() => void run(() => api.updateReport(report._id, "dismissed"), "Report dismissed").catch((e) => toast(errorMessage(e), "error"))}>
                    <XCircle size={16} />
                    Dismiss
                  </button>
                </>
              ) : null}
              {report.preview.status === "removed" && report.targetType !== "user" ? (
                <button className="ghost" onClick={() => restore(report)}>
                  <RotateCcw size={16} />
                  Restore
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
