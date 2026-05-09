import { Colors } from '@/constants/theme';

export type FeedPalette = (typeof Colors)['light'] | (typeof Colors)['dark'];

export function formatRelativeTime(value?: string) {
  if (!value) {
    return 'Now';
  }

  const date = new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / (1000 * 60)));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}
