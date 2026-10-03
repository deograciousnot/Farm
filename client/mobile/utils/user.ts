import { router } from 'expo-router';

import type { ApiUser } from '@/lib/types';

export function getUserId(user: Pick<ApiUser, '_id' | 'id'> | null | undefined) {
  return user?._id ?? user?.id;
}

export function openProfile(user: Pick<ApiUser, '_id' | 'id'> | null | undefined) {
  const id = getUserId(user);

  if (id) {
    router.push({ pathname: '/profile/[id]', params: { id } });
  }
}

/** "Farmer · Nakuru" style subtitle; skips missing parts. */
export function describeUser(user: Pick<ApiUser, 'role' | 'location'>, ...extra: (string | undefined)[]) {
  const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : undefined;
  return [role, user.location, ...extra].filter(Boolean).join(' · ');
}
