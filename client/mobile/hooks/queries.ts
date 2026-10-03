import { useFocusEffect } from '@react-navigation/native';
import { type InfiniteData, type QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { api } from '@/lib/api';
import type { FeedPost } from '@/lib/types';
import { usePreferences } from '@/providers/preferences-provider';
import { useSession } from '@/providers/session-provider';

// The cache is cleared whenever the signed-in identity changes (see session provider),
// so keys don't need to include the viewer.
export const queryKeys = {
  feed: (filter: string) => ['feed', filter] as const,
  feedRoot: ['feed'] as const,
  post: (id: string) => ['post', id] as const,
  comments: (postId: string) => ['comments', postId] as const,
  community: ['community'] as const,
  thread: (id: string) => ['thread', id] as const,
  threadReplies: (id: string) => ['thread', id, 'replies'] as const,
  marketplace: ['marketplace'] as const,
  product: (id: string) => ['product', id] as const,
  orders: (scope: 'buyer' | 'seller') => ['orders', scope] as const,
  ordersRoot: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  myProfile: ['profile', 'me'] as const,
  broadcasts: (scope: 'home' | 'all') => ['broadcasts', scope] as const,
  broadcastsRoot: ['broadcasts'] as const,
  broadcast: (id: string) => ['broadcast', id] as const,
  profile: (id: string) => ['profile', id] as const,
};

export type FeedPage = Awaited<ReturnType<typeof api.getFeed>>;

export function useFeed(filter: string) {
  const { token, isLoading } = useSession();

  return useInfiniteQuery({
    queryKey: queryKeys.feed(filter),
    queryFn: ({ pageParam }) => api.getFeed(token, filter === 'All' ? undefined : filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined),
    enabled: !isLoading,
  });
}

export function usePost(id: string | undefined) {
  const { token, isLoading } = useSession();

  return useQuery({
    queryKey: queryKeys.post(id ?? ''),
    queryFn: async () => (await api.getFeedPostById(id!, token)).item,
    enabled: Boolean(id) && !isLoading,
  });
}

export function useComments(postId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.comments(postId ?? ''),
    queryFn: async () => (await api.getComments(postId!)).items,
    enabled: Boolean(postId),
  });
}

export function useCommunity() {
  return useQuery({ queryKey: queryKeys.community, queryFn: api.getCommunity });
}

export function useThread(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.thread(id ?? ''),
    queryFn: async () => (await api.getThreadById(id!)).item,
    enabled: Boolean(id),
  });
}

export function useThreadReplies(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.threadReplies(id ?? ''),
    queryFn: async () => (await api.getThreadReplies(id!)).items,
    enabled: Boolean(id),
  });
}

export function useMarketplace() {
  return useQuery({
    queryKey: queryKeys.marketplace,
    queryFn: async () => {
      const [overview, listings] = await Promise.all([api.getMarketplaceOverview(), api.getProducts()]);
      return { filters: overview.filters, products: listings.items };
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.product(id ?? ''),
    queryFn: async () => (await api.getProductById(id!)).item,
    enabled: Boolean(id),
  });
}

export function useOrders(scope: 'buyer' | 'seller') {
  const { token } = useSession();

  return useQuery({
    queryKey: queryKeys.orders(scope),
    queryFn: async () => (await api.getOrders(token!, scope)).items,
    enabled: Boolean(token),
  });
}

export function useOrder(id: string | undefined) {
  const { token } = useSession();

  return useQuery({
    queryKey: queryKeys.order(id ?? ''),
    queryFn: () => api.getOrderById(token!, id!),
    enabled: Boolean(token && id),
  });
}

export function useMyProfile() {
  const { token } = useSession();

  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: () => api.getProfile(token!),
    enabled: Boolean(token),
  });
}

export function usePublicProfile(id: string | undefined) {
  const { token, isLoading } = useSession();

  return useQuery({
    queryKey: queryKeys.profile(id ?? ''),
    queryFn: () => api.getPublicProfile(id!, token),
    enabled: Boolean(id) && !isLoading,
  });
}

/** `home`: recent and not dismissed (shown on Home). `all`: every live update for this member. */
export function useBroadcasts(scope: 'home' | 'all' = 'all') {
  const { token, isLoading } = useSession();
  const { dismissedBroadcasts } = usePreferences();

  return useQuery({
    queryKey: queryKeys.broadcasts(scope),
    queryFn: async () => (await api.getBroadcasts(token, scope === 'home' ? 'home' : undefined)).items,
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    // Guests dismiss on this device only.
    select: (items) => (scope === 'home' && !token ? items.filter((item) => !dismissedBroadcasts.includes(item._id)) : items),
  });
}

export function useBroadcast(id: string | undefined) {
  const { token, isLoading } = useSession();

  return useQuery({
    queryKey: queryKeys.broadcast(id ?? ''),
    queryFn: async () => (await api.getBroadcast(id!, token)).item,
    enabled: Boolean(id) && !isLoading,
  });
}

/** Apply the same change to a post wherever it is cached (feed pages and post detail). */
export function patchPostInCache(client: QueryClient, postId: string, update: (post: FeedPost) => FeedPost) {
  client.setQueriesData<InfiniteData<FeedPage>>({ queryKey: queryKeys.feedRoot }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => (post._id === postId ? update(post) : post)),
          })),
        }
      : data
  );
  client.setQueryData<FeedPost>(queryKeys.post(postId), (post) => (post ? update(post) : post));
}

/** Refetch when a screen regains focus, without showing a loading state over cached data. */
export function useRefreshOnFocus(refetch: () => unknown) {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      void refetch();
    }, [refetch])
  );
}

/** Pull-to-refresh state that only spins for user-initiated refreshes, not background refetches. */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
