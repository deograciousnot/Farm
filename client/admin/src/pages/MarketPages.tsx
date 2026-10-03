import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, EyeOff, Flag, ImageOff, RotateCcw, Search, Star, StarOff, XCircle } from "lucide-react";

import { api } from "../api";
import { formatKes, formatNumber } from "../charts";
import { ListState, LoadMore, Pill, errorMessage, formatDate, useConfirm, usePaged, useToast } from "../components";
import type { AdminOrder, AdminProduct, OrderStatus, OrdersResponse } from "../types";

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value.trim()), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

// --- Listings ---------------------------------------------------------------------

export function ListingsPage({ onChanged }: { onChanged: () => void }) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("newest");
  const [categories, setCategories] = useState<string[]>([]);
  const confirm = useConfirm();
  const toast = useToast();

  const list = usePaged(async (page) => {
    const response = await api.getProducts({ page, search, category, status, sort });
    setCategories(response.categories);
    return response;
  }, `${search}|${category}|${status}|${sort}`);

  async function run(action: () => Promise<unknown>, success: string) {
    await action();
    toast(success);
    onChanged();
    await list.reload();
  }

  function remove(product: AdminProduct) {
    confirm({
      title: `Remove “${product.name}”?`,
      body: "Buyers won't see it or be able to order it. The seller is notified with your reason. You can restore it later.",
      confirmLabel: "Remove listing",
      reason: "required",
      reasonPlaceholder: "e.g. Photos don't match the product",
      onConfirm: (reason) => run(() => api.moderate("product", product._id, "removed", reason), "Listing removed"),
    });
  }

  return (
    <section className="card">
      <div className="card-head with-controls">
        <div>
          <h2>Listings</h2>
          <p>{formatNumber(list.total)} listings. Feature good sellers on the market home; remove anything misleading or unsafe.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search product, seller, or location" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="active">Live</option>
          <option value="featured">Featured</option>
          <option value="removed">Removed</option>
          <option value="all">All</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="price-high">Price: high to low</option>
          <option value="price-low">Price: low to high</option>
          <option value="low-stock">Lowest stock</option>
        </select>
      </div>
      <div className="table-list">
        <ListState isLoading={list.isLoading} error={list.error} isEmpty={!list.items.length} emptyText="No listings match." onRetry={() => void list.reload()} />
        {list.items.map((product) => {
          const isRemoved = product.moderationStatus === "removed";
          const image = product.mediaUrls?.[0];

          return (
            <article className={`listing-row ${isRemoved ? "removed" : ""}`} key={product._id}>
              {image ? (
                <img className="thumb" src={image} alt="" loading="lazy" />
              ) : (
                <span className="thumb placeholder" aria-hidden>
                  <ImageOff size={18} />
                </span>
              )}
              <div className="row-main">
                <div className="row-title">
                  <strong>{product.name}</strong>
                  <Pill>{product.category}</Pill>
                  {product.featured ? <Pill tone="amber">Featured</Pill> : null}
                  {isRemoved ? <Pill tone="red">Removed</Pill> : null}
                  {product.pendingReports ? (
                    <Pill tone="red">
                      <Flag size={12} /> {product.pendingReports}
                    </Pill>
                  ) : null}
                </div>
                <small className="muted">
                  {formatKes(product.price)} / {product.unit} · <span className={product.stock < 5 ? "warn-text" : ""}>{formatNumber(product.stock)} in stock</span> · {product.location}
                  {product.county && !product.location.toLowerCase().includes(product.county.toLowerCase()) ? ` (${product.county})` : ""}
                </small>
                <small className="muted">
                  {product.seller?.name ?? "Deleted seller"}
                  {product.seller?.verificationStatus && product.seller.verificationStatus !== "unverified" ? " · verified" : " · not verified"}
                  {product.seller?.accountStatus === "suspended" ? " · suspended" : ""} · {product.orderStats.orders} {product.orderStats.orders === 1 ? "order" : "orders"} ({product.orderStats.delivered} delivered,{" "}
                  {product.orderStats.cancelled} cancelled) · listed {formatDate(product.createdAt)}
                </small>
                {product.removedReason ? <small className="form-error">Removed: {product.removedReason}</small> : null}
              </div>
              <div className="actions">
                {!isRemoved ? (
                  <button
                    className="ghost"
                    onClick={() =>
                      void run(() => api.featureProduct(product._id, !product.featured), product.featured ? "No longer featured" : "Featured on the market").catch((error) =>
                        toast(errorMessage(error), "error")
                      )
                    }>
                    {product.featured ? <StarOff size={16} /> : <Star size={16} />}
                    {product.featured ? "Unfeature" : "Feature"}
                  </button>
                ) : null}
                {isRemoved ? (
                  <button className="ghost" onClick={() => void run(() => api.moderate("product", product._id, "active"), "Listing restored").catch((error) => toast(errorMessage(error), "error"))}>
                    <RotateCcw size={16} />
                    Restore
                  </button>
                ) : (
                  <button className="danger-button" onClick={() => remove(product)}>
                    <EyeOff size={16} />
                    Remove
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
      </div>
    </section>
  );
}

// --- Orders -----------------------------------------------------------------------

const orderFilters: { value: string; label: string }[] = [
  { value: "stuck", label: "Stuck" },
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "in-transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusTone: Record<OrderStatus, "neutral" | "green" | "amber" | "red"> = {
  pending: "amber",
  accepted: "neutral",
  "in-transit": "neutral",
  delivered: "green",
  cancelled: "red",
};

function isStuck(order: AdminOrder) {
  const age = Date.now() - new Date(order.status === "pending" ? order.createdAt : order.updatedAt).getTime();
  return (order.status === "pending" && age > 3 * 86_400_000) || (["accepted", "in-transit"].includes(order.status) && age > 7 * 86_400_000);
}

function daysAgo(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

export function OrdersPage({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState("stuck");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [summary, setSummary] = useState<OrdersResponse["summary"] | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const list = usePaged(async (page) => {
    const response = await api.getOrders({ page, status, search });
    setSummary(response.summary);
    return response;
  }, `${status}|${search}`);

  function cancel(order: AdminOrder) {
    confirm({
      title: `Cancel order #${order._id.slice(-6).toUpperCase()}?`,
      body: `${order.buyer?.name ?? "The buyer"} and ${order.seller?.name ?? "the seller"} will both be notified with your reason, and the stock goes back to the listing.`,
      confirmLabel: "Cancel order",
      reason: "required",
      reasonPlaceholder: "e.g. Seller unreachable for 5 days",
      onConfirm: async (reason) => {
        await api.cancelOrder(order._id, reason);
        toast("Order cancelled");
        onChanged();
        await list.reload();
      },
    });
  }

  const counts = summary?.byStatus ?? {};

  return (
    <div className="panel-grid">
      <div className="metrics-grid five">
        <button className={`metric-card clickable ${summary?.stuck ? "red" : ""}`} onClick={() => setStatus("stuck")}>
          <span>Stuck</span>
          <strong>{summary?.stuck ?? "—"}</strong>
        </button>
        {(["pending", "accepted", "in-transit", "delivered"] as OrderStatus[]).map((key) => (
          <button key={key} className={`metric-card clickable ${key === "delivered" ? "green" : ""}`} onClick={() => setStatus(key)}>
            <span>{key.replace("-", " ")}</span>
            <strong>{counts[key]?.count ?? 0}</strong>
            <small className="muted">{formatKes(counts[key]?.value ?? 0)}</small>
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-head with-controls">
          <div>
            <h2>Orders</h2>
            <p>
              {status === "stuck"
                ? "Pending for 3+ days, or accepted with no progress for a week. These usually mean a seller has gone quiet."
                : `${formatNumber(list.total)} orders.`}
            </p>
          </div>
          <div className="segmented" role="tablist">
            {orderFilters.map((filter) => (
              <button key={filter.value} role="tab" aria-selected={status === filter.value} className={status === filter.value ? "active" : ""} onClick={() => setStatus(filter.value)}>
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search buyer, seller, or product" />
          </label>
        </div>
        <div className="table-list">
          <ListState
            isLoading={list.isLoading}
            error={list.error}
            isEmpty={!list.items.length}
            emptyText={status === "stuck" ? "No stuck orders. Sellers are responding." : "No orders match."}
            onRetry={() => void list.reload()}
          />
          {list.items.map((order) => {
            const stuck = isStuck(order);
            const open = !["delivered", "cancelled"].includes(order.status);

            return (
              <article className="order-row" key={order._id}>
                <div className="row-main">
                  <div className="row-title">
                    <strong>#{order._id.slice(-6).toUpperCase()}</strong>
                    <Pill tone={statusTone[order.status]} capitalize>
                      {order.status.replace("-", " ")}
                    </Pill>
                    {stuck ? (
                      <Pill tone="red">
                        <AlertTriangle size={12} /> Stuck
                      </Pill>
                    ) : null}
                    <span className="muted">{order.items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(", ")}</span>
                  </div>
                  <div className="order-parties">
                    <span>
                      <strong>{order.buyer?.name ?? "Deleted buyer"}</strong>
                      <small className="muted">{order.buyer?.phone || order.deliveryContact || "No phone"}</small>
                    </span>
                    <ArrowRight size={14} className="muted" aria-label="buys from" />
                    <span>
                      <strong>{order.seller?.name ?? "Deleted seller"}</strong>
                      <small className="muted">{order.seller?.phone || "No phone"}</small>
                    </span>
                  </div>
                  <small className="muted">
                    Placed {formatDate(order.createdAt)} ({daysAgo(order.createdAt)}) · last update {daysAgo(order.updatedAt)} · deliver to {order.deliveryLocation || "not given"}
                  </small>
                </div>
                <div className="order-side">
                  <strong className="order-total">{formatKes(order.totalAmount)}</strong>
                  {open ? (
                    <button className="ghost" onClick={() => cancel(order)}>
                      <XCircle size={16} />
                      Cancel
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          <LoadMore hasMore={list.hasMore} isLoading={list.isLoading} onClick={() => void list.loadMore()} />
        </div>
      </section>
    </div>
  );
}
