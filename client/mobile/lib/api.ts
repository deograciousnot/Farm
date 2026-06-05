import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  Comment,
  CommunityThread,
  FeedHighlight,
  FeedPost,
  NotificationItem,
  Order,
  Product,
  ProfileResponse,
  RegisterInput,
  ThreadReply,
  SellerRemark,
  UploadableAsset,
} from '@/lib/types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
};

type AuthResponse = {
  token: string;
  user: ProfileResponse['profile'];
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export function isStaleSessionError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401 && /user no longer exists/i.test(error.message);
}

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const constantsAny = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };

  const hostUri =
    constantsAny.expoConfig?.hostUri ??
    constantsAny.expoGoConfig?.debuggerHost ??
    constantsAny.manifest2?.extra?.expoClient?.hostUri;

  const host = hostUri?.split(':')[0];

  if (host) {
    return `http://${host}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
}

const API_BASE_URL = `${getApiBaseUrl()}/api`;

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiRequestError(data.message || 'Request failed.', response.status);
  }

  return data;
}

async function requestFormData<T>(path: string, options: { token?: string | null; formData: FormData; method?: 'POST' | 'PATCH' }) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.formData,
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiRequestError(data.message || 'Request failed.', response.status);
  }

  return data;
}

function appendMediaAssets(formData: FormData, media: UploadableAsset[]) {
  media.forEach((asset, index) => {
    formData.append('media', {
      uri: asset.uri,
      type: asset.type,
      name: asset.name || `farmconnect-${Date.now()}-${index}`,
    } as unknown as Blob);
  });
}

function appendSingleAsset(formData: FormData, field: string, asset?: UploadableAsset | null) {
  if (!asset) {
    return;
  }

  formData.append(field, {
    uri: asset.uri,
    type: asset.type,
    name: asset.name || `farmconnect-${field}-${Date.now()}`,
  } as unknown as Blob);
}

export const api = {
  baseUrl: API_BASE_URL,
  loginDemoBuyer() {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: 'amina@farmconnect.app',
        password: 'password123',
      },
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  register(input: RegisterInput) {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('email', input.email);
    formData.append('password', input.password);
    formData.append('location', input.location);
    formData.append('role', input.role);
    input.interests.forEach((interest) => formData.append('interests', interest));
    appendSingleAsset(formData, 'avatar', input.avatar);

    return requestFormData<AuthResponse>('/auth/register', {
      formData,
    });
  },
  changePassword(token: string, input: { currentPassword: string; newPassword: string }) {
    return request<{ message: string }>('/auth/password', {
      method: 'PATCH',
      token,
      body: input,
    });
  },
  deleteAccount(token: string, input: { currentPassword: string; confirmation: string }) {
    return request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      token,
      body: input,
    });
  },
  getFeed(token?: string | null, filter?: string, page = 1, limit = 10) {
    const params = new URLSearchParams();

    if (filter) {
      params.set('filter', filter);
    }

    params.set('page', String(page));
    params.set('limit', String(limit));

    const query = `?${params.toString()}`;
    return request<{
      highlights: FeedHighlight[];
      interestChips: string[];
      activeFilter: string;
      pagination: { page: number; limit: number; total: number; hasMore: boolean };
      posts: FeedPost[];
      previewProducts: Product[];
    }>(`/feed${query}`, { token });
  },
  getComments(postId: string) {
    return request<{ items: Comment[] }>(`/feed/${postId}/comments`);
  },
  getFeedPostById(postId: string, token?: string | null) {
    return request<{ item: FeedPost }>(`/feed/${postId}`, { token });
  },
  createComment(token: string, postId: string, body: string) {
    return request<{ item: Comment; commentsCount: number }>(`/feed/${postId}/comments`, {
      method: 'POST',
      token,
      body: { body },
    });
  },
  toggleSave(token: string, postId: string) {
    return request<{ saved: boolean; savesCount: number }>(`/feed/${postId}/save`, {
      method: 'POST',
      token,
    });
  },
  toggleLike(token: string, postId: string) {
    return request<{ liked: boolean; likesCount: number }>(`/feed/${postId}/like`, {
      method: 'POST',
      token,
    });
  },
  deleteFeedPost(token: string, postId: string) {
    return request<{ postId: string; message: string }>(`/feed/${postId}`, {
      method: 'DELETE',
      token,
    });
  },
  reportContent(
    token: string,
    input: {
      targetType: 'post' | 'comment' | 'thread' | 'reply' | 'product' | 'user';
      targetId: string;
      reason: string;
      note?: string;
    }
  ) {
    return request<{ message: string }>('/reports', {
      method: 'POST',
      token,
      body: input,
    });
  },
  toggleFollow(token: string, userId: string) {
    return request<{ following: boolean; followersCount: number; followingCount: number }>(`/profile/${userId}/follow`, {
      method: 'POST',
      token,
    });
  },
  createFeedPost(
    token: string,
    input: {
      headline: string;
      body: string;
      tag?: string;
      location?: string;
      postType?: string;
      linkedProductId?: string;
      media?: UploadableAsset[];
    }
  ) {
    const formData = new FormData();
    formData.append('headline', input.headline);
    formData.append('body', input.body);
    formData.append('tag', input.tag ?? '');
    formData.append('location', input.location ?? '');
    formData.append('postType', input.postType ?? 'knowledge');
    formData.append('linkedProductId', input.linkedProductId ?? '');
    appendMediaAssets(formData, input.media ?? []);

    return requestFormData<{ item: FeedPost; message: string }>('/feed', {
      token,
      formData,
    });
  },
  getMarketplaceOverview() {
    return request<{
      filters: string[];
      shortcuts: { label: string; value: string }[];
      featuredProducts: Product[];
      totals: { listings: number; featured: number };
    }>('/marketplace/overview');
  },
  getProducts() {
    return request<{ items: Product[] }>('/marketplace/products');
  },
  createProduct(
    token: string,
    input: {
      name: string;
      category: string;
      description: string;
      unit: string;
      price: string;
      stock: string;
      location: string;
      isOrganic?: boolean;
      media?: UploadableAsset[];
    }
  ) {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('category', input.category);
    formData.append('description', input.description);
    formData.append('unit', input.unit);
    formData.append('price', input.price);
    formData.append('stock', input.stock);
    formData.append('location', input.location);
    formData.append('isOrganic', String(Boolean(input.isOrganic)));
    appendMediaAssets(formData, input.media ?? []);

    return requestFormData<{ item: Product; message: string }>('/marketplace/products', {
      token,
      formData,
    });
  },
  getProductById(id: string) {
    return request<{ item: Product }>(`/marketplace/products/${id}`);
  },
  getCommunity() {
    return request<{ rooms: string[]; stats: import('@/lib/types').CommunityStat[]; threads: CommunityThread[] }>('/community');
  },
  getThreadById(id: string) {
    return request<{ item: CommunityThread }>(`/community/${id}`);
  },
  getThreadReplies(id: string) {
    return request<{ items: ThreadReply[] }>(`/community/${id}/replies`);
  },
  createThread(token: string, input: { title: string; body: string; category: string; media?: UploadableAsset[] }) {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('body', input.body);
    formData.append('category', input.category);
    appendMediaAssets(formData, input.media ?? []);

    return requestFormData<{ item: CommunityThread; message: string }>('/community', {
      token,
      formData,
    });
  },
  createThreadReply(token: string, id: string, body: string) {
    return request<{ item: ThreadReply; message: string; repliesCount: number }>(`/community/${id}/replies`, {
      method: 'POST',
      token,
      body: { body },
    });
  },
  getOrders(token: string, scope?: 'buyer' | 'seller') {
    const query = scope === 'seller' ? '?scope=seller' : '';
    return request<{ items: Order[] }>(`/orders${query}`, { token });
  },
  getOrderById(token: string, orderId: string) {
    return request<{ item: Order; remark: SellerRemark | null }>(`/orders/${orderId}`, { token });
  },
  updateOrderStatus(token: string, orderId: string, status: 'accepted' | 'in-transit' | 'cancelled') {
    return request<{ item: Order; remark: SellerRemark | null; message: string }>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    });
  },
  createOrder(
    token: string,
    input: {
      productId: string;
      quantity: number;
      note?: string;
      deliveryLocation?: string;
      deliveryContact?: string;
    }
  ) {
    return request<{ item: Order; message: string }>('/orders', {
      method: 'POST',
      token,
      body: input,
    });
  },
  completeOrderWithRemark(token: string, orderId: string, input: { rating: number; body: string }) {
    return request<{ item: Order; remark: SellerRemark; message: string }>(`/orders/${orderId}/complete`, {
      method: 'POST',
      token,
      body: input,
    });
  },
  getProfile(token: string) {
    return request<ProfileResponse>('/profile/me', { token });
  },
  getPublicProfile(userId: string, token?: string | null) {
    return request<ProfileResponse>(`/profile/${userId}`, { token });
  },
  markNotificationRead(token: string, notificationId: string) {
    return request<{ item: NotificationItem; unreadCount: number; message: string }>(
      `/profile/notifications/${notificationId}/read`,
      {
        method: 'POST',
        token,
      }
    );
  },
  markAllNotificationsRead(token: string) {
    return request<{ items: NotificationItem[]; unreadCount: number; message: string }>(
      '/profile/notifications/read-all',
      {
        method: 'POST',
        token,
      }
    );
  },
  updateProfile(
    token: string,
    input: {
      name: string;
      location: string;
      bio: string;
      phone: string;
      interests: string[];
      avatar?: UploadableAsset | null;
    }
  ) {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('location', input.location);
    formData.append('bio', input.bio);
    formData.append('phone', input.phone);
    formData.append('interests', input.interests.join(','));
    appendSingleAsset(formData, 'avatar', input.avatar);

    return requestFormData<{ message: string; user: ProfileResponse['profile'] }>('/profile/me', {
      token,
      formData,
      method: 'PATCH',
    });
  },
  getSession(token: string) {
    return request<{ authenticated: boolean; user: ProfileResponse['profile'] }>('/auth/session', { token });
  },
};

export type { NotificationItem };
