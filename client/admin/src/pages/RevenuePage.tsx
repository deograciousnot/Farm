import { useState } from "react";

import { api } from "../api";
import { StatTile, formatKes, formatNumber } from "../charts";
import { ListState, LoadMore, Pill, formatDate, usePaged } from "../components";
import type { AdminPayment, RevenueWindow } from "../types";

const statusTone: Record<AdminPayment["status"], "neutral" | "green" | "amber" | "red"> = {
  paid: "green",
  pending: "amber",
  failed: "red",
  cancelled: "neutral",
};

function describePayment(payment: AdminPayment) {
  if (payment.purpose === "listing-boost") return `Listing boost · ${payment.product?.name ?? "deleted listing"}`;
  return `Sponsored credits · ${payment.organization?.name ?? "deleted organisation"}`;
}

/** M-Pesa income: what's coming in, from what, and every payment attempt. Test payments never count toward totals. */
export function RevenuePage() {
  const [status, setStatus] = useState("all");
  const [summary, setSummary] = useState<{ last30: RevenueWindow; previous30: RevenueWindow; allTime: RevenueWindow } | null>(null);
  const list = usePaged(async (page) => {
    const response = await api.getRevenue({ page, status });
    setSummary(response.summary);
    return response;
  }, status);

  const last30 = summary?.last30 ?? null;
  const previous30 = summary?.previous30 ?? null;

  return (
    <div className="stack">
      <div className="stat-grid">
        <StatTile label="Revenue, last 30 days" value={last30?.total ?? null} previous={previous30?.total} format={formatKes} />
        <StatTile label="Listing boosts" value={last30?.boosts ?? null} previous={previous30?.boosts} format={formatKes} hint="Last 30 days" />
        <StatTile label="Sponsored updates" value={last30?.sponsored ?? null} previous={previous30?.sponsored} format={formatKes} hint="Last 30 days" />
        <StatTile label="Paying customers" value={last30?.customers ?? null} previous={previous30?.customers} hint="Last 30 days" />
        <StatTile
          label="All-time revenue"
          value={summary?.allTime.total ?? null}
          format={formatKes}
          hint={summary ? `${formatNumber(summary.allTime.count)} payments from ${formatNumber(summary.allTime.customers)} customers` : undefined}
        />
      </div>

      <section className="card">
        <div className="card-head with-controls">
          <div>
            <h2>Payments</h2>
            <p>Every M-Pesa prompt sent. Payments marked Test were simulated in development and aren&apos;t counted above.</p>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Payment status">
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Waiting</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="table-list">
          <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No payments yet." onRetry={() => void list.reload()} />
          {list.items.map((payment) => (
            <article className="audit-row" key={payment._id}>
              <div className="row-main">
                <div className="row-title">
                  <Pill tone={statusTone[payment.status]} capitalize>
                    {payment.status}
                  </Pill>
                  {payment.simulated ? <Pill>Test</Pill> : null}
                  <strong>{formatKes(payment.amount)}</strong>
                </div>
                <p>{describePayment(payment)}</p>
                <small className="muted">
                  {payment.user?.name ?? "Deleted account"}
                  {payment.receipt ? ` · receipt ${payment.receipt}` : ""}
                  {payment.status !== "paid" && payment.message ? ` · ${payment.message}` : ""}
                </small>
              </div>
              <small className="muted audit-meta">{formatDate(payment.paidAt ?? payment.createdAt)}</small>
            </article>
          ))}
          <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
        </div>
      </section>
    </div>
  );
}
