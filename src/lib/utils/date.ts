import { format, parseISO } from 'date-fns';
import { DATE_FORMAT, DATETIME_FORMAT, DATE_FORMAT_LONG } from '@/lib/constants';

/**
 * Consistent date formatting utilities
 */

/**
 * Format ISO date string to readable format
 */
export function formatDate(date: string | Date | null | undefined, includeTime = false): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, includeTime ? DATETIME_FORMAT : DATE_FORMAT);
  } catch {
    return '-';
  }
}

/**
 * Format date in long format
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, DATE_FORMAT_LONG);
  } catch {
    return '-';
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return formatDate(dateObj);
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  } catch {
    return '-';
  }
}
