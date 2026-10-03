import { useEffect, useMemo, useState } from "react";
import { Download, Info, Loader2, MapPin } from "lucide-react";

import { api } from "../api";
import { BarList, ChartCard, DataTable, LineChart, StatTile, formatBucket, formatCompactKes, formatKes, formatNumber } from "../charts";
import { errorMessage, formatDate, useToast } from "../components";
import type { AnalyticsResponse, RegionRow } from "../types";

const ranges = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
] as const;

type RegionSort = keyof Pick<RegionRow, "farmers" | "buyers" | "listings" | "sales" | "salesValue" | "purchases" | "questions">;

const regionColumns: { key: RegionSort | "county" | "verified" | "unanswered"; label: string; money?: boolean }[] = [
  { key: "county", label: "County" },
  { key: "farmers", label: "Farmers" },
  { key: "buyers", label: "Buyers" },
  { key: "verified", label: "Verified" },
  { key: "listings", label: "Listings" },
  { key: "sales", label: "Sales" },
  { key: "salesValue", label: "Sales value", money: true },
  { key: "purchases", label: "Purchases" },
  { key: "questions", label: "Questions" },
  { key: "unanswered", label: "Unanswered" },
];

export function AnalyticsPage() {
  const toast = useToast();
  const [days, setDays] = useState<number>(30);
  const [county, setCounty] = useState("all");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [regionSort, setRegionSort] = useState<RegionSort>("farmers");
  const [priceGroup, setPriceGroup] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api
      .getAnalytics({ days, county })
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((loadError) => !cancelled && setError(errorMessage(loadError, "Couldn't load analytics.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, county]);

  const sortedRegions = useMemo(
    () => [...(data?.regions ?? [])].sort((a, b) => b[regionSort] - a[regionSort] || a.county.localeCompare(b.county)),
    [data, regionSort]
  );

  const prices = data?.prices ?? [];
  const selectedPrice = prices.find((group) => `${group.category}|${group.unit}` === priceGroup) ?? prices[0];

  async function exportReport() {
    setIsExporting(true);
    try {
      await api.downloadRegionalReport(days);
      toast("Regional report downloaded");
    } catch (exportError) {
      toast(errorMessage(exportError), "error");
    } finally {
      setIsExporting(false);
    }
  }

  if (!data) {
    return error ? (
      <div className="error-banner">{error}</div>
    ) : (
      <div className="loading-state">
        <Loader2 className="spin" size={18} /> Crunching the numbers…
      </div>
    );
  }

  const { current, previous } = data.kpis;
  const unit = data.range.unit;
  const countyLabel = county === "all" ? "all counties" : county === "unknown" ? "unmapped locations" : county;
  const countyOptions = Array.from(new Set([...data.regions.map((row) => row.county).filter((name) => name !== "Unknown"), ...data.counties])).sort();

  return (
    <div className={`panel-grid analytics ${isLoading ? "refreshing" : ""}`}>
      <div className="filter-row">
        <div className="segmented" role="tablist" aria-label="Date range">
          {ranges.map((range) => (
            <button key={range.days} role="tab" aria-selected={days === range.days} className={days === range.days ? "active" : ""} onClick={() => setDays(range.days)}>
              {range.label}
            </button>
          ))}
        </div>
        <label className="select-field">
          <MapPin size={16} />
          <select value={county} onChange={(event) => setCounty(event.target.value)} aria-label="County">
            <option value="all">All counties</option>
            {countyOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="unknown">Unmapped locations</option>
          </select>
        </label>
        {isLoading ? <Loader2 className="spin muted" size={18} /> : null}
        <button className="ghost push-right" onClick={() => void exportReport()} disabled={isExporting} title="Aggregated county figures with small counts hidden, safe to share with partners">
          {isExporting ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
          Partner report (CSV)
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stat-grid">
        <StatTile label="New farmers" value={current.newFarmers} previous={previous.newFarmers} />
        <StatTile label="New buyers" value={current.newBuyers} previous={previous.newBuyers} />
        <StatTile label="Active contributors" value={current.activeContributors} previous={previous.activeContributors} hint="Posted, asked, answered, or commented" />
        <StatTile
          label="Questions asked"
          value={current.questions}
          previous={previous.questions}
          hint={current.answerRate === null ? undefined : `${current.answerRate}% got an answer`}
        />
        <StatTile
          label="Orders"
          value={current.orders}
          previous={previous.orders}
          hint={current.completionRate === null ? undefined : `${current.completionRate}% delivered · ${current.cancellationRate}% cancelled`}
        />
        <StatTile label="Delivered value" value={current.deliveredValue} previous={previous.deliveredValue} format={formatCompactKes} />
      </div>

      <div className="split-grid">
        <ChartCard
          title="New members"
          subtitle={`Sign-ups per ${unit} in ${countyLabel}`}
          table={{
            columns: [
              { key: "period", label: "Period" },
              { key: "newFarmers", label: "Farmers", format: formatNumber },
              { key: "newBuyers", label: "Buyers & hobbyists", format: formatNumber },
            ],
            rows: data.series.map((row) => ({ ...row, period: formatBucket(row.bucket, unit, true) })),
          }}>
          <LineChart
            data={data.series}
            unit={unit}
            series={[
              { key: "newFarmers", label: "Farmers", slot: 1 },
              { key: "newBuyers", label: "Buyers & hobbyists", slot: 2 },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Knowledge sharing"
          subtitle={`Questions, answers, and field notes per ${unit}`}
          table={{
            columns: [
              { key: "period", label: "Period" },
              { key: "questions", label: "Questions", format: formatNumber },
              { key: "answers", label: "Answers & comments", format: formatNumber },
              { key: "posts", label: "Field notes", format: formatNumber },
            ],
            rows: data.series.map((row) => ({ ...row, period: formatBucket(row.bucket, unit, true) })),
          }}>
          <LineChart
            data={data.series}
            unit={unit}
            series={[
              { key: "answers", label: "Answers & comments", slot: 1 },
              { key: "questions", label: "Questions", slot: 2 },
              { key: "posts", label: "Field notes", slot: 3 },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Orders placed"
          subtitle={`Per ${unit}, any status`}
          table={{
            columns: [
              { key: "period", label: "Period" },
              { key: "orders", label: "Orders", format: formatNumber },
            ],
            rows: data.series.map((row) => ({ ...row, period: formatBucket(row.bucket, unit, true) })),
          }}>
          <LineChart data={data.series} unit={unit} series={[{ key: "orders", label: "Orders", slot: 1 }]} />
        </ChartCard>

        <ChartCard
          title="Delivered value"
          subtitle={`KES per ${unit}, delivered orders only`}
          table={{
            columns: [
              { key: "period", label: "Period" },
              { key: "deliveredValue", label: "Delivered value (KES)", format: formatNumber },
            ],
            rows: data.series.map((row) => ({ ...row, period: formatBucket(row.bucket, unit, true) })),
          }}>
          <LineChart data={data.series} unit={unit} format={formatKes} series={[{ key: "deliveredValue", label: "Delivered value", slot: 1 }]} />
        </ChartCard>
      </div>

      <section className="card">
        <div className="card-head with-controls">
          <div>
            <h2>Regions</h2>
            <p>
              Members and listings are current totals; sales, purchases, and questions are for the last {ranges.find((range) => range.days === days)?.label}. Sales count by the seller&apos;s county, purchases by delivery county. Click a county to focus on it.
            </p>
          </div>
          <label className="select-field">
            <span className="muted">Rank by</span>
            <select value={regionSort} onChange={(event) => setRegionSort(event.target.value as RegionSort)}>
              <option value="farmers">Farmers</option>
              <option value="buyers">Buyers</option>
              <option value="listings">Listings</option>
              <option value="sales">Sales</option>
              <option value="salesValue">Sales value</option>
              <option value="purchases">Purchases</option>
              <option value="questions">Questions</option>
            </select>
          </label>
        </div>
        <div className="regions-layout">
          <BarList
            rows={sortedRegions
              .filter((row) => row.county !== "Unknown")
              .slice(0, 12)
              .map((row) => ({
                label: row.county,
                value: row[regionSort],
                highlight: row.county === county,
                onClick: () => setCounty(row.county === county ? "all" : row.county),
              }))}
            format={regionSort === "salesValue" ? formatCompactKes : formatNumber}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {regionColumns.map((column) => (
                    <th key={column.key} className={column.key === "county" ? "" : "numeric"}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRegions.map((row) => (
                  <tr key={row.county} className={row.county === county ? "selected" : ""}>
                    {regionColumns.map((column) => {
                      const value = row[column.key];
                      return (
                        <td key={column.key} className={column.key === "county" ? "" : "numeric"}>
                          {column.key === "county" ? (
                            <button className="link-button" onClick={() => setCounty(row.county === "Unknown" ? "unknown" : row.county)}>
                              {row.county}
                            </button>
                          ) : column.money ? (
                            formatCompactKes(Number(value))
                          ) : (
                            formatNumber(Number(value))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="split-grid">
        <ChartCard
          title="Asking prices by county"
          subtitle={selectedPrice ? `Median price per ${selectedPrice.unit}, active listings. National median ${formatKes(selectedPrice.median)}.` : "No active listings."}
          action={
            prices.length ? (
              <select value={selectedPrice ? `${selectedPrice.category}|${selectedPrice.unit}` : ""} onChange={(event) => setPriceGroup(event.target.value)} aria-label="Product group">
                {prices.map((group) => (
                  <option key={`${group.category}|${group.unit}`} value={`${group.category}|${group.unit}`}>
                    {group.category} (per {group.unit}) · {group.listings}
                  </option>
                ))}
              </select>
            ) : null
          }
          table={
            selectedPrice
              ? {
                  columns: [
                    { key: "county", label: "County" },
                    { key: "median", label: "Median (KES)", format: formatNumber },
                    { key: "listings", label: "Listings", format: formatNumber },
                  ],
                  rows: selectedPrice.byCounty,
                }
              : undefined
          }>
          <BarList
            rows={(selectedPrice?.byCounty ?? []).map((entry) => ({
              label: entry.county,
              value: entry.median,
              note: entry.listings < 3 ? `${entry.listings} listing${entry.listings === 1 ? "" : "s"}, small sample` : `${entry.listings} listings`,
            }))}
            format={formatKes}
            emptyText="No active listings in this group."
          />
        </ChartCard>

        <ChartCard
          title="What buyers are ordering"
          subtitle="Order value by product category, excluding cancellations"
          table={{
            columns: [
              { key: "category", label: "Category" },
              { key: "orders", label: "Orders", format: formatNumber },
              { key: "value", label: "Value (KES)", format: formatNumber },
            ],
            rows: data.demand,
          }}>
          <BarList rows={data.demand.map((row) => ({ label: row.category, value: row.value, note: `${row.orders} orders` }))} format={formatCompactKes} />
        </ChartCard>

        <ChartCard
          title="What farmers are asking about"
          subtitle="Questions by topic in this period"
          table={{
            columns: [
              { key: "topic", label: "Topic" },
              { key: "questions", label: "Questions", format: formatNumber },
              { key: "unanswered", label: "Unanswered", format: formatNumber },
              { key: "views", label: "Views", format: formatNumber },
            ],
            rows: data.topics,
          }}>
          <BarList rows={data.topics.map((row) => ({ label: row.topic, value: row.questions, note: row.unanswered ? `${row.unanswered} unanswered` : "all answered" }))} />
        </ChartCard>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Waiting longest for an answer</h2>
              <p>Unanswered questions, oldest first. A good list to share with extension officers or experienced farmers.</p>
            </div>
          </div>
          {data.unanswered.length ? (
            <DataTable
              columns={[
                { key: "title", label: "Question" },
                { key: "category", label: "Topic" },
                { key: "where", label: "County" },
                { key: "asked", label: "Asked" },
              ]}
              rows={data.unanswered.map((thread) => ({
                title: thread.title,
                category: thread.category,
                where: thread.author?.county ?? "Unknown",
                asked: formatDate(thread.createdAt),
              }))}
            />
          ) : (
            <p className="empty">Every question has at least one answer.</p>
          )}
        </section>
      </div>

      {data.dataQuality.usersWithoutCounty || data.dataQuality.listingsWithoutCounty ? (
        <p className="data-note">
          <Info size={15} />
          {data.dataQuality.usersWithoutCounty} people and {data.dataQuality.listingsWithoutCounty} listings have a location we couldn&apos;t match to a county, so they
          appear as “Unknown”. A county picker at sign-up would close this gap.
        </p>
      ) : null}
    </div>
  );
}
