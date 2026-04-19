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
  UploadableAsset,
} from '@/lib/types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  token?: string | null;
  body?: unknown;
};

type AuthResponse = {
  token: string;
  user: ProfileResponse['profile'];
};

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
    throw new Error(data.message || 'Request failed.');
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
    throw new Error(data.message || 'Request failed.');
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
  getFeed(token?: string | null, filter?: string) {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return request<{
      highlights: FeedHighlight[];
      interestChips: string[];
      activeFilter: string;
      posts: FeedPost[];
      previewProducts: Product[];
    }>(`/feed${query}`, { token });
  },
  getComments(postId: string) {
    return request<{ items: Comment[] }>(`/feed/${postId}/comments`);
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
  createFeedPost(
    token: string,
    input: {
      headline: string;
      body: string;
      tag?: string;
      location?: string;
      postType?: string;
      media?: UploadableAsset[];
    }
  ) {
    const formData = new FormData();
    formData.append('headline', input.headline);
    formData.append('body', input.body);
    formData.append('tag', input.tag ?? '');
    formData.append('location', input.location ?? '');
    formData.append('postType', input.postType ?? 'knowledge');
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
  createThread(token: string, input: { title: string; body: string; category: string }) {
    return request<{ item: CommunityThread; message: string }>('/community', {
      method: 'POST',
      token,
      body: input,
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
  getProfile(token: string) {
    return request<ProfileResponse>('/profile/me', { token });
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
