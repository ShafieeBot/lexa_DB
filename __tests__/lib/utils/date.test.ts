import { formatDate, formatDateLong, getRelativeTime } from '@/lib/utils/date';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format ISO date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('should return dash for null', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatDateLong', () => {
    it('should format in long format', () => {
      const result = formatDateLong('2024-01-15');
      expect(result).toMatch(/January 15, 2024/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent date', () => {
      const now = new Date();
      const result = getRelativeTime(now);
      expect(result).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = getRelativeTime(fiveMinutesAgo);
      expect(result).toMatch(/5 minutes? ago/);
    });

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = getRelativeTime(twoHoursAgo);
      expect(result).toMatch(/2 hours? ago/);
    });
  });
});
