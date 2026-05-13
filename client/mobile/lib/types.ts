export type ApiUser = {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  role: string;
  location: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  trustScore?: number;
  verificationStatus?: string;
  interests?: string[];
  followersCount?: number;
  followingCount?: number;
};

export type Comment = {
  _id: string;
  body: string;
  createdAt: string;
  author: ApiUser;
};

export type FeedHighlight = {
  label: string;
  value: number | string;
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
  hasSaved: boolean;
  hasLiked?: boolean;
  isOwner?: boolean;
  isFollowingAuthor?: boolean;
  canFollowAuthor?: boolean;
  createdAt?: string;
  author: ApiUser;
  recentComments: Comment[];
  linkedProduct?: {
    _id: string;
    name: string;
    price: number;
    unit: string;
    location: string;
  } | null;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }>;
  bodyBlocks?: Array<
    | {
        type: 'paragraph';
        text: string;
      }
    | {
        type: 'image' | 'video';
        url: string;
        thumbnailUrl?: string;
        mediaIndex?: number;
      }
  >;
};

export type Product = {
  _id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  stock: number;
  location: string;
  sellerType: string;
  featured?: boolean;
  mediaUrls?: string[];
  seller: ApiUser;
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
  author: ApiUser;
  createdAt?: string;
};

export type ThreadReply = {
  _id: string;
  body: string;
  createdAt: string;
  author: ApiUser;
};

export type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
};

export type Order = {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: string;
  etaLabel: string;
  note: string;
  deliveryLocation?: string;
  deliveryContact?: string;
  buyer: ApiUser;
  seller: ApiUser;
  createdAt?: string;
  updatedAt?: string;
};

export type SellerRemark = {
  _id: string;
  order: string;
  rating: number;
  body: string;
  createdAt: string;
  buyer: ApiUser;
  seller: ApiUser;
};

export type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  type: 'order' | 'community' | 'system' | 'like' | 'comment' | 'reply';
  isRead: boolean;
  createdAt: string;
};

export type ProfileResponse = {
  profile: ApiUser;
  metrics: {
    posts: number;
    listings: number;
    orders: number;
  };
  socialGraph: {
    isOwner: boolean;
    isFollowing: boolean;
    followers: ApiUser[];
    following: ApiUser[];
  };
  posts: FeedPost[];
  listings: Product[];
  notificationMeta: {
    unreadCount: number;
  };
  notifications: NotificationItem[];
  remarks: {
    received: SellerRemark[];
    given: SellerRemark[];
  };
};

export type CommunityStat = {
  category: string;
  threads: number;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  location: string;
  role: 'farmer' | 'buyer' | 'hobbyist';
  interests: string[];
  avatar?: UploadableAsset | null;
};

export type UploadableAsset = {
  uri: string;
  type: string;
  name?: string;
  fileSize?: number;
};
