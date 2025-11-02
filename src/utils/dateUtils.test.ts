/**
 * Tests for date utility functions
 * Focuses on error handling and validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compareDates,
  daysBetween,
  formatDate,
  formatDateTime,
  formatForFilename,
  getCurrentTimestamp,
  getRelativeTime,
  isOlderThan,
} from './dateUtils'
import { monitoring } from './monitoring'

// Mock the monitoring utility
vi.mock('./monitoring', () => ({
  monitoring: {
    logError: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
}))

describe('dateUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentTimestamp', () => {
    it('should return ISO string for current time', () => {
      const timestamp = getCurrentTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
    })
  })

  describe('formatDate', () => {
    it('should format valid Date object', () => {
      const date = new Date('2025-10-29T12:00:00Z')
      const result = formatDate(date)
      expect(result).not.toBe('Invalid Date')
      expect(typeof result).toBe('string')
    })

    it('should format valid ISO date string', () => {
      const result = formatDate('2025-10-29T12:00:00Z')
      expect(result).not.toBe('Invalid Date')
      expect(typeof result).toBe('string')
    })

    it('should handle null input and log error', () => {
      const result = formatDate(null as unknown as string)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })

    it('should handle undefined input and log error', () => {
      const result = formatDate(undefined as unknown as string)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })

    it('should handle empty string and log error', () => {
      const result = formatDate('')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })

    it('should handle whitespace-only string and log error', () => {
      const result = formatDate('   ')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })

    it('should handle invalid date string and log error', () => {
      const result = formatDate('not-a-valid-date')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })

    it('should handle invalid Date object (NaN) and log error', () => {
      const invalidDate = new Date('invalid')
      const result = formatDate(invalidDate)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date',
        })
      )
    })
  })

  describe('formatDateTime', () => {
    it('should format valid Date object', () => {
      const date = new Date('2025-10-29T12:00:00Z')
      const result = formatDateTime(date)
      expect(result).not.toBe('Invalid Date')
      expect(typeof result).toBe('string')
    })

    it('should format valid ISO date string', () => {
      const result = formatDateTime('2025-10-29T12:00:00Z')
      expect(result).not.toBe('Invalid Date')
      expect(typeof result).toBe('string')
    })

    it('should handle null input and log error', () => {
      const result = formatDateTime(null as unknown as string)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
          additionalData: expect.objectContaining({
            input: 'null',
            inputType: 'object',
          }),
        })
      )
    })

    it('should handle undefined input and log error', () => {
      const result = formatDateTime(undefined as unknown as string)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
          additionalData: expect.objectContaining({
            input: 'undefined',
            inputType: 'undefined',
          }),
        })
      )
    })

    it('should handle empty string and log error', () => {
      const result = formatDateTime('')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
          additionalData: expect.objectContaining({
            input: '',
            inputType: 'string',
          }),
        })
      )
    })

    it('should handle whitespace-only string and log error', () => {
      const result = formatDateTime('   ')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
        })
      )
    })

    it('should handle invalid date string and log error', () => {
      const result = formatDateTime('not-a-valid-date')
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
          additionalData: expect.objectContaining({
            input: 'not-a-valid-date',
            inputType: 'string',
          }),
        })
      )
    })

    it('should handle invalid Date object (NaN) and log error', () => {
      const invalidDate = new Date('invalid')
      const result = formatDateTime(invalidDate)
      expect(result).toBe('Invalid Date')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'date_utils',
          action: 'format_date_time',
        })
      )
    })

    it('should log error details including timestamp for invalid dates', () => {
      formatDateTime('invalid-date-string')
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          additionalData: expect.objectContaining({
            timestamp: expect.any(Number),
          }),
        })
      )
    })

    it('should never throw - always returns string', () => {
      expect(() => formatDateTime(null as unknown as string)).not.toThrow()
      expect(() => formatDateTime(undefined as unknown as string)).not.toThrow()
      expect(() => formatDateTime('')).not.toThrow()
      expect(() => formatDateTime('invalid')).not.toThrow()
    })
  })

  describe('getRelativeTime', () => {
    const now = Date.now()

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "just now" for recent dates', () => {
      const recentDate = new Date(now - 30 * 1000) // 30 seconds ago
      expect(getRelativeTime(recentDate)).toBe('just now')
    })

    it('should return minutes for dates within an hour', () => {
      const date = new Date(now - 5 * 60 * 1000) // 5 minutes ago
      expect(getRelativeTime(date)).toBe('5 minutes ago')
    })

    it('should return singular "minute" for 1 minute', () => {
      const date = new Date(now - 60 * 1000) // 1 minute ago
      expect(getRelativeTime(date)).toBe('1 minute ago')
    })

    it('should return hours for dates within a day', () => {
      const date = new Date(now - 3 * 60 * 60 * 1000) // 3 hours ago
      expect(getRelativeTime(date)).toBe('3 hours ago')
    })

    it('should return days for dates within a week', () => {
      const date = new Date(now - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      expect(getRelativeTime(date)).toBe('2 days ago')
    })

    it('should return formatted date for dates older than a week', () => {
      const date = new Date(now - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      const result = getRelativeTime(date)
      expect(result).not.toBe('just now')
      expect(result).not.toContain('ago')
    })
  })

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const date1 = '2025-10-01T00:00:00Z'
      const date2 = '2025-10-10T00:00:00Z'
      expect(daysBetween(date1, date2)).toBe(9)
    })

    it('should return absolute difference regardless of order', () => {
      const date1 = '2025-10-10T00:00:00Z'
      const date2 = '2025-10-01T00:00:00Z'
      expect(daysBetween(date1, date2)).toBe(9)
    })

    it('should handle Date objects', () => {
      const date1 = new Date('2025-10-01T00:00:00Z')
      const date2 = new Date('2025-10-10T00:00:00Z')
      expect(daysBetween(date1, date2)).toBe(9)
    })

    it('should return 0 for same dates', () => {
      const date = '2025-10-29T12:00:00Z'
      expect(daysBetween(date, date)).toBe(0)
    })
  })

  describe('isOlderThan', () => {
    it('should return true for dates older than specified days', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      expect(isOlderThan(oldDate, 5)).toBe(true)
    })

    it('should return false for dates newer than specified days', () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      expect(isOlderThan(recentDate, 5)).toBe(false)
    })

    it('should handle string dates', () => {
      const oldDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString()
      expect(isOlderThan(oldDate, 5)).toBe(true)
    })
  })

  describe('formatForFilename', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const date = new Date('2025-10-29T12:34:56Z')
      expect(formatForFilename(date)).toBe('2025-10-29')
    })

    it('should format string date', () => {
      expect(formatForFilename('2025-10-29T12:34:56Z')).toBe('2025-10-29')
    })

    it('should use current date if no date provided', () => {
      const result = formatForFilename()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('compareDates', () => {
    const older = '2025-10-01T00:00:00Z'
    const newer = '2025-10-10T00:00:00Z'

    it('should sort descending by default (newer first)', () => {
      expect(compareDates(older, newer)).toBeGreaterThan(0)
      expect(compareDates(newer, older)).toBeLessThan(0)
    })

    it('should sort ascending when specified', () => {
      expect(compareDates(older, newer, false)).toBeLessThan(0)
      expect(compareDates(newer, older, false)).toBeGreaterThan(0)
    })

    it('should return 0 for equal dates', () => {
      expect(compareDates(older, older)).toBe(0)
    })

    it('should handle Date objects', () => {
      const date1 = new Date(older)
      const date2 = new Date(newer)
      expect(compareDates(date1, date2)).toBeGreaterThan(0)
    })

    it('should handle mixed string and Date inputs', () => {
      const date1 = new Date(older)
      expect(compareDates(date1, newer)).toBeGreaterThan(0)
      expect(compareDates(older, new Date(newer))).toBeGreaterThan(0)
    })
  })
})
