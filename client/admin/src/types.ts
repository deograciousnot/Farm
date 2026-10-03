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

export type AdminProfile = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

export type ModerationStatus = "active" | "removed";
export type ModeratableType = "post" | "thread" | "comment" | "reply" | "product";

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
  moderationStatus?: ModerationStatus;
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
  moderationStatus?: ModerationStatus;
  removedReason?: string;
  createdAt?: string;
  author: ApiUser;
};

export type ReportTargetType = "post" | "comment" | "thread" | "reply" | "product" | "user";

export type Report = {
  _id: string;
  targetType: ReportTargetType;
  target: string;
  reason: string;
  note?: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  createdAt?: string;
  reporter?: ApiUser | null;
  preview: {
    title: string;
    body?: string;
    context?: string;
    status: "active" | "removed" | "suspended" | "missing";
    author?: { _id: string; name: string; email?: string } | null;
  };
};

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "farmer" | "buyer" | "hobbyist";
  location: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  verificationStatus: "unverified" | "verified" | "top-rated";
  trustScore: number;
  accountStatus: "active" | "suspended";
  suspendedReason?: string;
  isAdmin?: boolean;
  createdAt: string;
  followersCount: number;
  listingsCount: number;
  completedSales: number;
  pendingReports: number;
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

export type AdminAction = {
  _id: string;
  action: string;
  targetType: string;
  target: string;
  summary: string;
  reason?: string;
  createdAt: string;
  admin?: { name: string; email?: string } | null;
};

export type OverviewResponse = {
  stats: Record<string, number>;
  topPosts: FeedPost[];
  topThreads: CommunityThread[];
  recentActions: AdminAction[];
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

export type AdminProduct = {
  _id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  stock: number;
  location: string;
  county?: string | null;
  featured?: boolean;
  mediaUrls?: string[];
  moderationStatus?: ModerationStatus;
  removedReason?: string;
  createdAt: string;
  seller?: (ApiUser & { accountStatus?: string }) | null;
  orderStats: { orders: number; delivered: number; cancelled: number };
  pendingReports: number;
};

export type OrderStatus = "pending" | "accepted" | "in-transit" | "delivered" | "cancelled";

export type AdminOrder = {
  _id: string;
  items: { product?: string; name: string; quantity: number; unitPrice: number; unit: string }[];
  totalAmount: number;
  status: OrderStatus;
  etaLabel?: string;
  note?: string;
  deliveryLocation?: string;
  deliveryContact?: string;
  createdAt: string;
  updatedAt: string;
  buyer?: (ApiUser & { phone?: string }) | null;
  seller?: (ApiUser & { phone?: string }) | null;
};

export type OrdersResponse = Paginated<AdminOrder> & {
  summary: { byStatus: Partial<Record<OrderStatus, { count: number; value: number }>>; stuck: number };
};

export type AnalyticsKpis = {
  newFarmers: number;
  newBuyers: number;
  activeContributors: number;
  questions: number;
  answerRate: number | null;
  listingsAdded: number;
  orders: number;
  requestedValue: number;
  deliveredValue: number;
  completionRate: number | null;
  cancellationRate: number | null;
};

export type RegionRow = {
  county: string;
  farmers: number;
  buyers: number;
  verified: number;
  listings: number;
  sales: number;
  salesValue: number;
  purchases: number;
  purchaseValue: number;
  questions: number;
  unanswered: number;
  answers: number;
};

export type AnalyticsResponse = {
  range: { days: number; from: string; to: string; unit: "day" | "week" | "month" };
  county: string;
  counties: string[];
  kpis: { current: AnalyticsKpis; previous: AnalyticsKpis };
  series: {
    bucket: string;
    newFarmers: number;
    newBuyers: number;
    posts: number;
    questions: number;
    answers: number;
    orders: number;
    deliveredValue: number;
  }[];
  regions: RegionRow[];
  prices: {
    category: string;
    unit: string;
    listings: number;
    median: number;
    min: number;
    max: number;
    byCounty: { county: string; listings: number; median: number }[];
  }[];
  topics: { topic: string; questions: number; unanswered: number; views: number }[];
  demand: { category: string; orders: number; value: number }[];
  unanswered: { _id: string; title: string; category: string; createdAt: string; author?: { name: string; county?: string } | null }[];
  dataQuality: { usersWithoutCounty: number; listingsWithoutCounty: number };
};

export type OrganizationType = "government" | "county" | "research" | "ngo" | "cooperative" | "company" | "other";

export type Organization = {
  _id: string;
  name: string;
  type: OrganizationType;
  description: string;
  website: string;
  logoUrl: string;
  broadcasts: number;
  reach: number;
};

export type BroadcastCategory = "advisory" | "pest-alert" | "weather" | "market" | "program" | "training";

export type BroadcastInput = {
  organization: string;
  title: string;
  body: string;
  category: BroadcastCategory;
  counties: string[];
  roles: string[];
  link: { label: string; url: string };
  expiresAt: string | null;
};

export type AdminBroadcast = Omit<BroadcastInput, "organization"> & {
  _id: string;
  organization: { _id: string; name: string; type: OrganizationType } | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  publishedBy?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  reach: number;
  views: number;
  memberViews: number;
};
