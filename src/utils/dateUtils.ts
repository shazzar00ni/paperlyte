/**
 * Date and time utility functions
 * Provides consistent date handling across the application
 */

import { monitoring } from './monitoring'

/**
 * Get current timestamp as ISO string
 * Single source of truth for creating timestamps
 *
 * @returns ISO 8601 formatted timestamp string (e.g., "2025-10-30T12:34:56.789Z")
 * @author Paperlyte Team
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Format date for display
 * Returns a human-readable date string
 *
 * @param date - Date string or Date object to format
 * @returns Formatted date string or 'Invalid Date' on error
 * @throws Never throws - returns fallback for invalid input
 */
export function formatDate(date: string | Date): string {
  // Validate input type
  if (date === null || date === undefined) {
    const error = new Error('formatDate received null or undefined input')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'format_date',
      additionalData: { input: String(date), inputType: typeof date },
    })
    return 'Invalid Date'
  }

  // Validate string input is not empty
  if (typeof date === 'string' && date.trim() === '') {
    const error = new Error('formatDate received empty string')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'format_date',
      additionalData: { input: date, inputType: 'string' },
    })
    return 'Invalid Date'
  }

  try {
    // Construct Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date

    // Validate Date object is valid using Number.isFinite
    if (!Number.isFinite(dateObj.getTime())) {
      const error = new Error('formatDate constructed invalid Date object')
      monitoring.logError(error, {
        feature: 'date_utils',
        action: 'format_date',
        additionalData: {
          input: typeof date === 'string' ? date : date.toISOString(),
          inputType: typeof date,
          timestamp: dateObj.getTime(),
        },
      })
      return 'Invalid Date'
    }

    // Successfully validated - format and return
    return dateObj.toLocaleDateString()
  } catch (error) {
    // Handle any unexpected errors during Date construction or formatting
    monitoring.logError(error as Error, {
      feature: 'date_utils',
      action: 'format_date',
      additionalData: {
        input: String(date),
        inputType: typeof date,
        errorMessage: (error as Error).message,
      },
    })
    return 'Invalid Date'
  }
}

/**
 * Format date and time for display
 * Returns a human-readable date and time string
 *
 * @param date - Date string or Date object to format
 * @returns Formatted date/time string or 'Invalid Date' on error
 * @throws Never throws - returns fallback for invalid input
 */
export function formatDateTime(date: string | Date): string {
  // Validate input type
  if (date === null || date === undefined) {
    const error = new Error('formatDateTime received null or undefined input')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'format_date_time',
      additionalData: { input: String(date), inputType: typeof date },
    })
    return 'Invalid Date'
  }

  // Validate string input is not empty
  if (typeof date === 'string' && date.trim() === '') {
    const error = new Error('formatDateTime received empty string')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'format_date_time',
      additionalData: { input: date, inputType: 'string' },
    })
    return 'Invalid Date'
  }

  try {
    // Construct Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date

    // Validate Date object is valid using Number.isFinite
    if (!Number.isFinite(dateObj.getTime())) {
      const error = new Error('formatDateTime constructed invalid Date object')
      monitoring.logError(error, {
        feature: 'date_utils',
        action: 'format_date_time',
        additionalData: {
          input: typeof date === 'string' ? date : date.toISOString(),
          inputType: typeof date,
          timestamp: dateObj.getTime(),
        },
      })
      return 'Invalid Date'
    }

    // Successfully validated - format and return
    return dateObj.toLocaleString()
  } catch (error) {
    // Handle any unexpected errors during Date construction or formatting
    monitoring.logError(error as Error, {
      feature: 'date_utils',
      action: 'format_date_time',
      additionalData: {
        input: String(date),
        inputType: typeof date,
        errorMessage: (error as Error).message,
      },
    })
    return 'Invalid Date'
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "just now")
 *
 * @param date - Date string or Date object to format
 * @returns Relative time string or 'Invalid Date' on error
 * @throws Never throws - returns fallback for invalid input
 */
export function getRelativeTime(date: string | Date): string {
  // Validate input type
  if (date === null || date === undefined) {
    const error = new Error('getRelativeTime received null or undefined input')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'get_relative_time',
      additionalData: { input: String(date), inputType: typeof date },
    })
    return 'Invalid Date'
  }

  // Validate string input is not empty
  if (typeof date === 'string' && date.trim() === '') {
    const error = new Error('getRelativeTime received empty string')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'get_relative_time',
      additionalData: { input: date, inputType: 'string' },
    })
    return 'Invalid Date'
  }

  // Parse date into Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Validate Date object has a finite timestamp before using getTime()
  const timestamp = dateObj.getTime()
  if (!Number.isFinite(timestamp)) {
    const error = new Error('getRelativeTime constructed invalid Date object')
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'get_relative_time',
      additionalData: {
        input: typeof date === 'string' ? date : String(date),
        inputType: typeof date,
        timestamp: timestamp,
      },
    })
    return 'Invalid Date'
  }

  // All validations passed - perform relative time calculations
  const now = Date.now()
  const diffMs = now - timestamp

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return 'just now'
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  } else {
    return formatDate(dateObj)
  }
}

/**
 * Calculate days between two dates
 *
 * @param date1 - First date (string or Date object)
 * @param date2 - Second date (string or Date object)
 * @returns Integer number of days between the two dates
 * @throws RangeError if either date is invalid (prevents NaN propagation)
 */
export function daysBetween(
  date1: string | Date,
  date2: string | Date
): number {
  // Validate first date parameter
  if (date1 === null || date1 === undefined) {
    throw new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - received ${date1} (type: ${typeof date1})`
    )
  }

  // Validate string input is not empty
  if (typeof date1 === 'string' && date1.trim() === '') {
    throw new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - received empty string`
    )
  }

  // Validate second date parameter
  if (date2 === null || date2 === undefined) {
    throw new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - received ${date2} (type: ${typeof date2})`
    )
  }

  // Validate string input is not empty
  if (typeof date2 === 'string' && date2.trim() === '') {
    throw new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - received empty string`
    )
  }

  // Parse first date and validate
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d1Time = d1.getTime()
  if (Number.isNaN(d1Time)) {
    const date1Value = typeof date1 === 'string' ? date1 : String(date1)
    throw new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - constructed Date has NaN timestamp (input: "${date1Value}", type: ${typeof date1})`
    )
  }

  // Parse second date and validate
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const d2Time = d2.getTime()
  if (Number.isNaN(d2Time)) {
    const date2Value = typeof date2 === 'string' ? date2 : String(date2)
    throw new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - constructed Date has NaN timestamp (input: "${date2Value}", type: ${typeof date2})`
    )
  }

  // All validations passed - calculate integer day difference
  const diffMs = Math.abs(d2Time - d1Time)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is older than specified days
 *
 * @param date - Date string or Date object to check
 * @param days - Number of days threshold (must be non-negative and finite)
 * @returns True if date is older than specified days, false otherwise
 * @throws Error if date is invalid or days is not a valid non-negative number
 */
export function isOlderThan(date: string | Date, days: number): boolean {
  // Validate date parameter - check for null/undefined
  if (date === null || date === undefined) {
    throw new Error(
      `isOlderThan: Invalid date parameter - received ${date} (type: ${typeof date})`
    )
  }

  // Validate string input is not empty
  if (typeof date === 'string' && date.trim() === '') {
    throw new Error(
      `isOlderThan: Invalid date parameter - received empty string (type: string)`
    )
  }

  // Parse date into Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Validate Date object has a finite timestamp
  const timestamp = dateObj.getTime()
  if (!Number.isFinite(timestamp)) {
    const dateValue = typeof date === 'string' ? date : String(date)
    throw new Error(
      `isOlderThan: Invalid date parameter - constructed Date has non-finite timestamp (input: "${dateValue}", type: ${typeof date}, timestamp: ${timestamp})`
    )
  }

  // Validate days parameter is a finite number
  if (!Number.isFinite(days)) {
    throw new Error(
      `isOlderThan: Invalid days parameter - must be finite number (received: ${days}, type: ${typeof days})`
    )
  }

  // Validate days parameter is non-negative
  if (days < 0) {
    throw new Error(
      `isOlderThan: Invalid days parameter - must be non-negative (received: ${days})`
    )
  }

  // Validate days parameter is an integer per project convention
  if (!Number.isInteger(days)) {
    throw new Error(
      `isOlderThan: Invalid days parameter - must be an integer (received: ${days})`
    )
  }

  // All validations passed - calculate and compare
  const diffDays = daysBetween(new Date(), dateObj)
  return diffDays > days
}

/**
 * Format date for filename (YYYY-MM-DD)
 *
 * @param date - Optional date string or Date object to format (defaults to current date)
 * @returns Formatted date string (YYYY-MM-DD) or 'invalid-date' on error
 * @throws Never throws - returns fallback for invalid input
 */
export function formatForFilename(date?: string | Date): string {
  try {
    // Validate string input is not empty
    if (date !== undefined && typeof date === 'string' && date.trim() === '') {
      const error = new Error('formatForFilename received empty string')
      monitoring.logError(error, {
        feature: 'date_utils',
        action: 'format_for_filename',
        additionalData: { input: date, inputType: 'string' },
      })
      return 'invalid-date'
    }

    // Parse date into Date object
    const dateObj = date
      ? typeof date === 'string'
        ? new Date(date)
        : date
      : new Date()

    // Validate Date object has a finite timestamp before calling toISOString()
    const timestamp = dateObj.getTime()
    if (!Number.isFinite(timestamp)) {
      const error = new Error(
        'formatForFilename constructed invalid Date object'
      )
      monitoring.logError(error, {
        feature: 'date_utils',
        action: 'format_for_filename',
        additionalData: {
          input: date
            ? typeof date === 'string'
              ? date
              : String(date)
            : 'undefined',
          inputType: typeof date,
          timestamp: timestamp,
        },
      })
      return 'invalid-date'
    }

    // Successfully validated - format as YYYY-MM-DD
    return dateObj.toISOString().split('T')[0]
  } catch (error) {
    // Handle any unexpected errors during Date construction or formatting
    monitoring.logError(error as Error, {
      feature: 'date_utils',
      action: 'format_for_filename',
      additionalData: {
        input: date ? String(date) : 'undefined',
        inputType: typeof date,
        errorMessage: (error as Error).message,
      },
    })
    return 'invalid-date'
  }
}

/**
 * Compare two dates for sorting
 * Returns negative if a < b, positive if a > b, 0 if equal
 *
 * @param a - First date (string or Date object)
 * @param b - Second date (string or Date object)
 * @param descending - Sort order (default: true for newest first)
 * @returns Negative if a < b, positive if a > b, 0 if equal
 * @throws Error if either date is invalid (prevents NaN breaking Array.sort)
 */
export function compareDates(
  a: string | Date,
  b: string | Date,
  descending = true
): number {
  // Validate first date parameter
  if (a === null || a === undefined) {
    throw new Error(
      `compareDates: Invalid first date parameter 'a' - received ${a} (type: ${typeof a})`
    )
  }

  // Validate string input is not empty
  if (typeof a === 'string' && a.trim() === '') {
    throw new Error(
      `compareDates: Invalid first date parameter 'a' - received empty string`
    )
  }

  // Validate second date parameter
  if (b === null || b === undefined) {
    throw new Error(
      `compareDates: Invalid second date parameter 'b' - received ${b} (type: ${typeof b})`
    )
  }

  // Validate string input is not empty
  if (typeof b === 'string' && b.trim() === '') {
    throw new Error(
      `compareDates: Invalid second date parameter 'b' - received empty string`
    )
  }

  // Parse and validate first date
  const aObj = typeof a === 'string' ? new Date(a) : a
  const aTime = aObj.getTime()
  if (!Number.isFinite(aTime)) {
    const aValue = typeof a === 'string' ? a : String(a)
    throw new Error(
      `compareDates: Invalid first date parameter 'a' - constructed Date has non-finite timestamp (input: "${aValue}", type: ${typeof a}, timestamp: ${aTime})`
    )
  }

  // Parse and validate second date
  const bObj = typeof b === 'string' ? new Date(b) : b
  const bTime = bObj.getTime()
  if (!Number.isFinite(bTime)) {
    const bValue = typeof b === 'string' ? b : String(b)
    throw new Error(
      `compareDates: Invalid second date parameter 'b' - constructed Date has non-finite timestamp (input: "${bValue}", type: ${typeof b}, timestamp: ${bTime})`
    )
  }

  // All validations passed - perform comparison with validated numeric times
  return descending ? bTime - aTime : aTime - bTime
}
