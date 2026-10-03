import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Table2 } from "lucide-react";

/**
 * Small SVG chart kit for the admin dashboard.
 *
 * Colours come from CSS variables (--series-1..3), validated for colour-blind separation in
 * light and dark mode. Keep series to three or fewer per chart; past that, split the chart.
 */

export type SeriesSlot = 1 | 2 | 3;
export type Series = { key: string; label: string; slot: SeriesSlot };
type Datum = Record<string, number | string>;

const numberFormat = new Intl.NumberFormat("en-KE");
const compactFormat = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (value: number) => numberFormat.format(value);
export const formatKes = (value: number) => `KES ${numberFormat.format(Math.round(value))}`;
export const formatCompactKes = (value: number) => `KES ${compactFormat.format(value)}`;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Round the axis maximum up to a clean number and return evenly spaced ticks. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep) ?? rawStep;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step);
}

export function formatBucket(iso: string, unit: string, long = false) {
  const date = new Date(iso);
  if (unit === "month") return date.toLocaleDateString("en-KE", { month: "short", year: long ? "numeric" : "2-digit", timeZone: "Africa/Nairobi" });
  const label = date.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
  return unit === "week" && long ? `Week of ${label}` : label;
}

// --- Card wrapper with table view --------------------------------------------------

type Column = { key: string; label: string; format?: (value: number) => string };

export function ChartCard({
  title,
  subtitle,
  table,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  table?: { columns: Column[]; rows: Datum[] };
  children: ReactNode;
  action?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="card chart-card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="control-row">
          {action}
          {table ? (
            <button className={`icon-button ${showTable ? "active" : ""}`} onClick={() => setShowTable((value) => !value)} aria-pressed={showTable} title={showTable ? "Show chart" : "Show as table"}>
              <Table2 size={17} />
            </button>
          ) : null}
        </div>
      </div>
      {showTable && table ? <DataTable columns={table.columns} rows={table.rows} /> : children}
    </section>
  );
}

export function DataTable({ columns, rows }: { columns: Column[]; rows: Datum[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.format ? "numeric" : ""}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => {
                const value = row[column.key];
                return (
                  <td key={column.key} className={column.format ? "numeric" : ""}>
                    {column.format && typeof value === "number" ? column.format(value) : String(value ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Line chart --------------------------------------------------------------------------

const PLOT_HEIGHT = 200;
const X_AXIS_BAND = 28;
const MARGIN = { top: 12, right: 52, left: 56 };

export function LineChart({
  data,
  series,
  unit,
  format = formatNumber,
  axisFormat = (value: number) => compactFormat.format(value),
}: {
  data: Datum[];
  series: Series[];
  unit: string;
  format?: (value: number) => string;
  axisFormat?: (value: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const values = data.flatMap((datum) => series.map((item) => Number(datum[item.key]) || 0));
  const ticks = niceTicks(Math.max(...values, 0));
  const yMax = ticks[ticks.length - 1] || 1;
  const x = (index: number) => MARGIN.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 70))));

  const paths = useMemo(
    () =>
      series.map((item) => ({
        ...item,
        line: data.map((datum, index) => `${index ? "L" : "M"}${x(index)},${y(Number(datum[item.key]) || 0)}`).join(""),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, series, width, yMax]
  );

  // End labels sit by the last point; skip any that would collide with one already placed.
  const endLabels = useMemo(() => {
    const placed: number[] = [];
    return series
      .map((item) => ({ item, value: Number(data[data.length - 1]?.[item.key]) || 0 }))
      .sort((a, b) => b.value - a.value)
      .filter(({ value }) => {
        const top = y(value);
        if (placed.some((other) => Math.abs(other - top) < 14)) return false;
        placed.push(top);
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, series, width, yMax]);

  function pointerToIndex(clientX: number, target: SVGRectElement) {
    const box = target.getBoundingClientRect();
    const relative = (clientX - box.left) / box.width;
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(relative * (data.length - 1)))));
  }

  const activeDatum = active === null ? null : data[active];

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 ? (
        <ul className="legend">
          {series.map((item) => (
            <li key={item.key}>
              <span className="line-key" style={{ background: `var(--series-${item.slot})` }} />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      {width > 0 ? (
        <svg
          width={width}
          height={MARGIN.top + PLOT_HEIGHT + X_AXIS_BAND}
          role="img"
          aria-label={`${series.map((item) => item.label).join(", ")} over time. Use left and right arrow keys to read values.`}
          tabIndex={0}
          onFocus={() => setActive((current) => current ?? data.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setActive((current) => Math.max(0, (current ?? data.length) - 1));
            if (event.key === "ArrowRight") setActive((current) => Math.min(data.length - 1, (current ?? -1) + 1));
          }}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="gridline" x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(tick)} y2={y(tick)} />
              <text className="axis-label" x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {axisFormat(tick)}
              </text>
            </g>
          ))}
          {data.map((datum, index) =>
            // Always label the last bucket; drop a regular tick that would crowd it.
            index === data.length - 1 || (index % labelEvery === 0 && data.length - 1 - index >= labelEvery * 0.75) ? (
              <text key={index} className="axis-label" x={x(index)} y={MARGIN.top + PLOT_HEIGHT + 18} textAnchor="middle">
                {formatBucket(String(datum.bucket), unit)}
              </text>
            ) : null
          )}
          {series.length === 1 ? (
            <path
              d={`${paths[0].line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
              style={{ fill: `var(--series-${series[0].slot})` }}
              className="area-wash"
            />
          ) : null}
          {paths.map((path) => (
            <path key={path.key} d={path.line} className="series-line" style={{ stroke: `var(--series-${path.slot})` }} />
          ))}
          {endLabels.map(({ item, value }) => (
            <g key={item.key}>
              <circle className="marker" cx={x(data.length - 1)} cy={y(value)} r={4} style={{ fill: `var(--series-${item.slot})` }} />
              <text className="end-label" x={x(data.length - 1) + 9} y={y(value)} dy="0.32em">
                {axisFormat(value)}
              </text>
            </g>
          ))}
          {active !== null ? (
            <g>
              <line className="crosshair" x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + PLOT_HEIGHT} />
              {series.map((item) => (
                <circle
                  key={item.key}
                  className="marker"
                  cx={x(active)}
                  cy={y(Number(data[active][item.key]) || 0)}
                  r={4}
                  style={{ fill: `var(--series-${item.slot})` }}
                />
              ))}
            </g>
          ) : null}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={(event) => pointerToIndex(event.clientX, event.currentTarget)}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      ) : null}
      {activeDatum && active !== null ? (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(x(active), 90), width - 90), top: MARGIN.top + (series.length > 1 ? 30 : 0) }}
          role="status">
          <span className="tooltip-title">{formatBucket(String(activeDatum.bucket), unit, true)}</span>
          {series.map((item) => (
            <span key={item.key} className="tooltip-row">
              <span className="line-key" style={{ background: `var(--series-${item.slot})` }} />
              <strong>{format(Number(activeDatum[item.key]) || 0)}</strong>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// --- Horizontal bar list ---------------------------------------------------------------

export type BarRow = { label: string; value: number; note?: string; highlight?: boolean; onClick?: () => void };

/** Ranked horizontal bars, one series. Labels left, value at the bar tip. */
export function BarList({ rows, format = formatNumber, emptyText = "No data for this range." }: { rows: BarRow[]; format?: (value: number) => string; emptyText?: string }) {
  const max = Math.max(...rows.map((row) => row.value), 0);

  if (!rows.length || max === 0) {
    return <p className="empty">{emptyText}</p>;
  }

  return (
    <ul className="bar-list">
      {rows.map((row) => {
        const content = (
          <>
            <span className="bar-label">
              {row.label}
              {row.note ? <small>{row.note}</small> : null}
            </span>
            <span className="bar-track">
              {/* Scale within the track minus room for the value label, so the label sits at the bar tip. */}
              <span className={`bar ${row.highlight ? "highlight" : ""}`} style={{ width: `calc((100% - 96px) * ${Math.max(0.015, row.value / max)})` }} />
              <span className="bar-value">{format(row.value)}</span>
            </span>
          </>
        );

        return (
          <li key={row.label} title={`${row.label}: ${format(row.value)}${row.note ? ` (${row.note})` : ""}`}>
            {row.onClick ? (
              <button className="bar-row" onClick={row.onClick}>
                {content}
              </button>
            ) : (
              <div className="bar-row">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// --- Stat tile ---------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  previous,
  format = formatNumber,
  hint,
  higherIsBetter = true,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  format?: (value: number) => string;
  hint?: string;
  higherIsBetter?: boolean;
}) {
  const hasDelta = value !== null && previous !== null && previous !== undefined;
  const change = hasDelta && previous ? Math.round(((value - previous) / previous) * 100) : null;
  const direction = !hasDelta || value === previous ? "flat" : value > (previous ?? 0) ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") === higherIsBetter;

  return (
    <article className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value === null ? "—" : format(value)}</strong>
      {hasDelta ? (
        <span className={`stat-delta ${good === null ? "" : good ? "good" : "bad"}`}>
          {direction === "up" ? <ArrowUpRight size={14} /> : direction === "down" ? <ArrowDownRight size={14} /> : <Minus size={14} />}
          {change === null ? (previous === 0 && value ? "new" : "no change") : `${change > 0 ? "+" : ""}${change}%`}
          <span className="muted"> vs previous period</span>
        </span>
      ) : null}
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </article>
  );
}
