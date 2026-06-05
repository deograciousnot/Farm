import type { AdminNotification, CommunityThread, FeedPost, OverviewResponse, Paginated, Report } from "./types";

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")}/api`;

type RequestOptions = {
  secret: string;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": options.secret,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const api = {
  baseUrl: API_BASE_URL,
  getOverview(secret: string) {
    return request<OverviewResponse>("/admin/overview", { secret });
  },
  getReports(secret: string, status = "pending") {
    return request<Paginated<Report>>(`/admin/reports?status=${encodeURIComponent(status)}`, { secret });
  },
  updateReport(secret: string, reportId: string, status: Report["status"]) {
    return request<{ item: Report; message: string }>(`/admin/reports/${reportId}`, {
      secret,
      method: "PATCH",
      body: { status },
    });
  },
  getFeed(secret: string, params: { sort?: string; status?: string }) {
    const query = new URLSearchParams({
      sort: params.sort ?? "newest",
      status: params.status ?? "all",
      limit: "30",
    });
    return request<Paginated<FeedPost>>(`/admin/feed?${query.toString()}`, { secret });
  },
  pinPost(secret: string, postId: string, isPinned: boolean) {
    return request<{ item: FeedPost; message: string }>(`/admin/feed/${postId}/pin`, {
      secret,
      method: "PATCH",
      body: { isPinned },
    });
  },
  moderatePost(secret: string, postId: string, status: "active" | "removed", reason = "") {
    return request<{ item: FeedPost; message: string }>(`/admin/feed/${postId}/moderation`, {
      secret,
      method: "PATCH",
      body: { status, reason },
    });
  },
  getThreads(secret: string, params: { sort?: string; status?: string }) {
    const query = new URLSearchParams({
      sort: params.sort ?? "top",
      status: params.status ?? "all",
      limit: "30",
    });
    return request<Paginated<CommunityThread>>(`/admin/threads?${query.toString()}`, { secret });
  },
  pinThread(secret: string, threadId: string, isPinned: boolean) {
    return request<{ item: CommunityThread; message: string }>(`/admin/threads/${threadId}/pin`, {
      secret,
      method: "PATCH",
      body: { isPinned },
    });
  },
  moderateThread(secret: string, threadId: string, status: "active" | "removed", reason = "") {
    return request<{ item: CommunityThread; message: string }>(`/admin/threads/${threadId}/moderation`, {
      secret,
      method: "PATCH",
      body: { status, reason },
    });
  },
  getNotifications(secret: string, type = "all") {
    return request<Paginated<AdminNotification>>(`/admin/notifications?type=${encodeURIComponent(type)}`, { secret });
  },
  deleteNotification(secret: string, notificationId: string) {
    return request<{ item: AdminNotification; message: string }>(`/admin/notifications/${notificationId}`, {
      secret,
      method: "DELETE",
    });
  },
};
