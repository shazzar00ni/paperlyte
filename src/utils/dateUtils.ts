/**
 * Date and time utility functions
 * Provides consistent date handling across the application
 */

import { monitoring } from './monitoring'

/**
 * Safely get string representation of date input for logging
 * Handles string, valid Date, and invalid Date inputs without throwing
 *
 * @param input - Date string or Date object to represent
 * @returns Safe string representation of the input
 */
function safeInputRepresentation(input: string | Date): string {
  if (typeof input === 'string') {
    return input
  } else if (input instanceof Date && Number.isFinite(input.getTime())) {
    return input.toISOString()
  } else {
    return String(input)
  }
}

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
  // Record the operation attempt
  monitoring.addBreadcrumb('formatDate called', 'info', {
    feature: 'date_utils',
    action: 'format_date',
    inputType: typeof date,
  })

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
          input: safeInputRepresentation(date),
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
  // Record the attempt to format a date
  monitoring.addBreadcrumb('formatDateTime called', 'info', {
    inputType: typeof date,
  })

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
          input: safeInputRepresentation(date),
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
  // Record function invocation
  monitoring.addBreadcrumb('daysBetween called', 'info', {
    date1Type: typeof date1,
    date2Type: typeof date2,
  })

  // Validate first date parameter
  if (date1 === null || date1 === undefined) {
    const error = new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - received ${date1} (type: ${typeof date1})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: String(date1),
        date1Type: typeof date1,
        date2: String(date2),
        date2Type: typeof date2,
      },
    })
    throw error
  }

  // Validate string input is not empty
  if (typeof date1 === 'string' && date1.trim() === '') {
    const error = new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - received empty string`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: date1,
        date1Type: 'string',
        date2: String(date2),
        date2Type: typeof date2,
      },
    })
    throw error
  }

  // Validate second date parameter
  if (date2 === null || date2 === undefined) {
    const error = new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - received ${date2} (type: ${typeof date2})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: String(date1),
        date1Type: typeof date1,
        date2: String(date2),
        date2Type: typeof date2,
      },
    })
    throw error
  }

  // Validate string input is not empty
  if (typeof date2 === 'string' && date2.trim() === '') {
    const error = new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - received empty string`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: String(date1),
        date1Type: typeof date1,
        date2: date2,
        date2Type: 'string',
      },
    })
    throw error
  }

  // Parse first date and validate
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d1Time = d1.getTime()
  if (Number.isNaN(d1Time)) {
    const date1Value = typeof date1 === 'string' ? date1 : String(date1)
    const error = new RangeError(
      `daysBetween: Invalid first date parameter 'date1' - constructed Date has NaN timestamp (input: "${date1Value}", type: ${typeof date1})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: date1Value,
        date1Type: typeof date1,
        date1Timestamp: d1Time,
        date2: String(date2),
        date2Type: typeof date2,
      },
    })
    throw error
  }

  // Parse second date and validate
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const d2Time = d2.getTime()
  if (Number.isNaN(d2Time)) {
    const date2Value = typeof date2 === 'string' ? date2 : String(date2)
    const error = new RangeError(
      `daysBetween: Invalid second date parameter 'date2' - constructed Date has NaN timestamp (input: "${date2Value}", type: ${typeof date2})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'days_between',
      additionalData: {
        date1: String(date1),
        date1Type: typeof date1,
        date1Timestamp: d1Time,
        date2: date2Value,
        date2Type: typeof date2,
        date2Timestamp: d2Time,
      },
    })
    throw error
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
  // Record function invocation
  monitoring.addBreadcrumb('isOlderThan called', 'info', {
    dateType: typeof date,
    days: days,
  })

  // Validate date parameter - check for null/undefined
  if (date === null || date === undefined) {
    const error = new Error(
      `isOlderThan: Invalid date parameter - received ${date} (type: ${typeof date})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: String(date),
        dateType: typeof date,
        days: days,
      },
    })
    throw error
  }

  // Validate string input is not empty
  if (typeof date === 'string' && date.trim() === '') {
    const error = new Error(
      `isOlderThan: Invalid date parameter - received empty string (type: string)`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: date,
        dateType: 'string',
        days: days,
      },
    })
    throw error
  }

  // Parse date into Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Validate Date object has a finite timestamp
  const timestamp = dateObj.getTime()
  if (!Number.isFinite(timestamp)) {
    const dateValue = typeof date === 'string' ? date : String(date)
    const error = new Error(
      `isOlderThan: Invalid date parameter - constructed Date has non-finite timestamp (input: "${dateValue}", type: ${typeof date}, timestamp: ${timestamp})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: dateValue,
        dateType: typeof date,
        timestamp: timestamp,
        days: days,
      },
    })
    throw error
  }

  // Validate days parameter is a finite number
  if (!Number.isFinite(days)) {
    const error = new Error(
      `isOlderThan: Invalid days parameter - must be finite number (received: ${days}, type: ${typeof days})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: String(date),
        dateType: typeof date,
        days: days,
        daysType: typeof days,
      },
    })
    throw error
  }

  // Validate days parameter is non-negative
  if (days < 0) {
    const error = new Error(
      `isOlderThan: Invalid days parameter - must be non-negative (received: ${days})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: String(date),
        dateType: typeof date,
        days: days,
      },
    })
    throw error
  }

  // Validate days parameter is an integer per project convention
  if (!Number.isInteger(days)) {
    const error = new Error(
      `isOlderThan: Invalid days parameter - must be an integer (received: ${days})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'is_older_than',
      additionalData: {
        date: String(date),
        dateType: typeof date,
        days: days,
      },
    })
    throw error
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
      monitoring.addBreadcrumb(
        'formatForFilename validation failed: empty string',
        'error',
        {
          input: date,
          inputType: 'string',
        }
      )
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
      monitoring.addBreadcrumb(
        'formatForFilename validation failed: non-finite timestamp',
        'error',
        {
          input: date
            ? typeof date === 'string'
              ? date
              : String(date)
            : 'undefined',
          inputType: typeof date,
          timestamp: timestamp,
        }
      )
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
    monitoring.addBreadcrumb('formatForFilename exception caught', 'error', {
      input: date ? String(date) : 'undefined',
      inputType: typeof date,
      errorMessage: (error as Error).message,
    })
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
  // Record invocation with inputs
  monitoring.addBreadcrumb('compareDates called', 'info', {
    aType: typeof a,
    bType: typeof b,
    descending: descending,
  })

  // Validate first date parameter
  if (a === null || a === undefined) {
    const error = new RangeError(
      `compareDates: Invalid first date parameter 'a' - received ${a} (type: ${typeof a})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: String(a),
        aType: typeof a,
        b: String(b),
        bType: typeof b,
        descending: descending,
      },
    })
    throw error
  }

  // Validate string input is not empty
  if (typeof a === 'string' && a.trim() === '') {
    const error = new RangeError(
      `compareDates: Invalid first date parameter 'a' - received empty string`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: a,
        aType: 'string',
        b: String(b),
        bType: typeof b,
        descending: descending,
      },
    })
    throw error
  }

  // Validate second date parameter
  if (b === null || b === undefined) {
    const error = new RangeError(
      `compareDates: Invalid second date parameter 'b' - received ${b} (type: ${typeof b})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: String(a),
        aType: typeof a,
        b: String(b),
        bType: typeof b,
        descending: descending,
      },
    })
    throw error
  }

  // Validate string input is not empty
  if (typeof b === 'string' && b.trim() === '') {
    const error = new RangeError(
      `compareDates: Invalid second date parameter 'b' - received empty string`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: String(a),
        aType: typeof a,
        b: b,
        bType: 'string',
        descending: descending,
      },
    })
    throw error
  }

  // Parse and validate first date
  const aObj = typeof a === 'string' ? new Date(a) : a
  const aTime = aObj.getTime()
  if (!Number.isFinite(aTime)) {
    const aValue = typeof a === 'string' ? a : String(a)
    const error = new RangeError(
      `compareDates: Invalid first date parameter 'a' - constructed Date has non-finite timestamp (input: "${aValue}", type: ${typeof a}, timestamp: ${aTime})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: aValue,
        aType: typeof a,
        aTimestamp: aTime,
        b: String(b),
        bType: typeof b,
        descending: descending,
      },
    })
    throw error
  }

  // Parse and validate second date
  const bObj = typeof b === 'string' ? new Date(b) : b
  const bTime = bObj.getTime()
  if (!Number.isFinite(bTime)) {
    const bValue = typeof b === 'string' ? b : String(b)
    const error = new RangeError(
      `compareDates: Invalid second date parameter 'b' - constructed Date has non-finite timestamp (input: "${bValue}", type: ${typeof b}, timestamp: ${bTime})`
    )
    monitoring.logError(error, {
      feature: 'date_utils',
      action: 'compare_dates',
      additionalData: {
        a: String(a),
        aType: typeof a,
        aTimestamp: aTime,
        b: bValue,
        bType: typeof b,
        bTimestamp: bTime,
        descending: descending,
      },
    })
    throw error
  }

  // All validations passed - perform comparison with validated numeric times
  return descending ? bTime - aTime : aTime - bTime
}
