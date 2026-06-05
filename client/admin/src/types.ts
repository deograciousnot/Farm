export type ApiUser = {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  role: string;
  location: string;
  avatarUrl?: string;
  verificationStatus?: string;
};

export type FeedPost = {
  _id: string;
  headline: string;
  body: string;
  tag: string;
  location: string;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isSponsored: boolean;
  isPinned: boolean;
  moderationStatus?: "active" | "removed";
  removedReason?: string;
  createdAt?: string;
  author: ApiUser;
};

export type CommunityThread = {
  _id: string;
  title: string;
  body: string;
  preview: string;
  category: string;
  repliesCount: number;
  viewsCount: number;
  isPinned: boolean;
  moderationStatus?: "active" | "removed";
  removedReason?: string;
  createdAt?: string;
  author: ApiUser;
};

export type Report = {
  _id: string;
  targetType: string;
  target: string;
  reason: string;
  note?: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  createdAt?: string;
  reporter?: ApiUser | null;
};

export type AdminNotification = {
  _id: string;
  title: string;
  body: string;
  type: "order" | "community" | "system" | "like" | "comment" | "reply";
  isRead: boolean;
  createdAt?: string;
  user?: ApiUser | null;
};

export type OverviewResponse = {
  stats: Record<string, number>;
  recentReports: Report[];
  topPosts: FeedPost[];
  topThreads: CommunityThread[];
};

export type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};
