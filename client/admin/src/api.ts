import type {
  AdminAction,
  AdminBroadcast,
  BroadcastInput,
  Organization,
  AdminProduct,
  AnalyticsResponse,
  OrdersResponse,
  AdminNotification,
  AdminProfile,
  AdminUser,
  CommunityThread,
  FeedPost,
  ModeratableType,
  OverviewResponse,
  Paginated,
  Report,
} from "./types";

function resolveApiBaseUrl() {
  const rawBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim().replace(/\/$/, "");
  return rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_KEY = "farmconnect-admin-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    // Remove the old shared-secret login, which the API no longer accepts.
    localStorage.removeItem("farmconnect-admin-secret");
  },
};

let onUnauthorized: (() => void) | null = null;

/** The app registers a handler so an expired or revoked session returns to the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string | null } = {}) {
  const token = options.token === undefined ? tokenStore.get() : options.token;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the FarmConnect API. Check that the server is running.", 0);
  }

  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && token && path !== "/auth/login") {
      onUnauthorized?.();
    }
    throw new ApiError(data.message || "Request failed.", response.status);
  }

  return data;
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString() ? `?${search}` : "";
}

export const api = {
  async login(email: string, password: string) {
    const { token } = await request<{ token: string }>("/auth/login", { method: "POST", body: { email, password }, token: null });
    // Confirm admin rights before keeping the token.
    const { admin } = await request<{ admin: AdminProfile }>("/admin/me", { token }).catch((error: ApiError) => {
      throw error.status === 403 ? new ApiError("This account doesn't have admin access.", 403) : error;
    });
    tokenStore.set(token);
    return admin;
  },
  me: () => request<{ admin: AdminProfile }>("/admin/me"),
  getOverview: () => request<OverviewResponse>("/admin/overview"),

  getReports: (params: { status?: string; page?: number }) => request<Paginated<Report>>(`/admin/reports${query(params)}`),
  updateReport: (reportId: string, status: "reviewed" | "dismissed" | "pending") =>
    request(`/admin/reports/${reportId}`, { method: "PATCH", body: { status } }),
  actOnReport: (reportId: string, reason: string) =>
    request<{ message: string }>(`/admin/reports/${reportId}/action`, { method: "POST", body: { reason } }),

  moderate: (targetType: ModeratableType, id: string, status: "active" | "removed", reason = "") =>
    request<{ message: string }>(`/admin/content/${targetType}/${id}/moderation`, { method: "PATCH", body: { status, reason } }),

  getFeed: (params: { page?: number; sort?: string; status?: string }) => request<Paginated<FeedPost>>(`/admin/feed${query(params)}`),
  pinPost: (postId: string, isPinned: boolean) => request(`/admin/feed/${postId}/pin`, { method: "PATCH", body: { isPinned } }),

  getThreads: (params: { page?: number; sort?: string; status?: string }) =>
    request<Paginated<CommunityThread>>(`/admin/threads${query(params)}`),
  pinThread: (threadId: string, isPinned: boolean) => request(`/admin/threads/${threadId}/pin`, { method: "PATCH", body: { isPinned } }),

  getUsers: (params: { page?: number; search?: string; role?: string; verification?: string; status?: string }) =>
    request<Paginated<AdminUser>>(`/admin/users${query(params)}`),
  setVerification: (userId: string, status: "verified" | "unverified") =>
    request<{ message: string }>(`/admin/users/${userId}/verification`, { method: "PATCH", body: { status } }),
  setUserStatus: (userId: string, status: "active" | "suspended", reason = "", removeContent = false) =>
    request<{ message: string }>(`/admin/users/${userId}/status`, { method: "PATCH", body: { status, reason, removeContent } }),
  bulkDeleteUsers: (userIds: string[], reason = "") =>
    request<{ message: string; deleted: number; skipped: number }>("/admin/users/bulk-delete", { method: "POST", body: { userIds, reason } }),

  getNotifications: (params: { page?: number; type?: string }) =>
    request<Paginated<AdminNotification>>(`/admin/notifications${query(params)}`),
  deleteNotification: (notificationId: string) => request(`/admin/notifications/${notificationId}`, { method: "DELETE" }),

  getProducts: (params: { page?: number; search?: string; category?: string; county?: string; status?: string; sort?: string }) =>
    request<Paginated<AdminProduct> & { categories: string[] }>(`/admin/products${query(params)}`),
  featureProduct: (productId: string, featured: boolean) =>
    request<{ message: string }>(`/admin/products/${productId}/feature`, { method: "PATCH", body: { featured } }),

  getOrders: (params: { page?: number; status?: string; search?: string }) => request<OrdersResponse>(`/admin/orders${query(params)}`),
  cancelOrder: (orderId: string, reason: string) =>
    request<{ message: string }>(`/admin/orders/${orderId}/cancel`, { method: "PATCH", body: { reason } }),

  getAnalytics: (params: { days: number; county?: string }) => request<AnalyticsResponse>(`/admin/analytics${query(params)}`),
  /** Downloads the partner-safe regional CSV (auth header required, so not a plain link). */
  async downloadRegionalReport(days: number) {
    const token = tokenStore.get();
    const response = await fetch(`${API_BASE_URL}/admin/analytics/export.csv?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError("Couldn't build the report.", response.status);
    const url = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement("a"), { href: url, download: `farmconnect-regions-${days}d.csv` });
    link.click();
    URL.revokeObjectURL(url);
  },

  getOrganizations: () => request<{ items: Organization[] }>("/admin/organizations"),
  saveOrganization: (input: Partial<Organization>, id?: string) =>
    request<{ message: string; item: Organization }>(id ? `/admin/organizations/${id}` : "/admin/organizations", {
      method: id ? "PATCH" : "POST",
      body: input,
    }),
  getBroadcasts: (params: { page?: number; status?: string }) => request<Paginated<AdminBroadcast>>(`/admin/broadcasts${query(params)}`),
  getAudience: (counties: string[], roles: string[]) =>
    request<{ count: number; byRole: Record<string, number> }>(`/admin/broadcasts/audience${query({ counties: counties.join(","), roles: roles.join(",") })}`),
  saveBroadcast: (input: BroadcastInput, id?: string) =>
    request<{ message: string; item: AdminBroadcast }>(id ? `/admin/broadcasts/${id}` : "/admin/broadcasts", {
      method: id ? "PATCH" : "POST",
      body: input,
    }),
  publishBroadcast: (id: string) => request<{ message: string }>(`/admin/broadcasts/${id}/publish`, { method: "POST" }),
  archiveBroadcast: (id: string) => request<{ message: string }>(`/admin/broadcasts/${id}/archive`, { method: "POST" }),

  getAudit: (params: { page?: number; action?: string }) => request<Paginated<AdminAction>>(`/admin/audit${query(params)}`),
};
