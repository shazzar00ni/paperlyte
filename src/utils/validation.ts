/**
 * Input validation utilities
 * Centralized validation logic for all user inputs
 */

import { monitoring } from './monitoring'
import { sanitizeContent, sanitizeTitle } from './sanitization'

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  error: string | null
}

/**
 * Email validation using RFC 5322 simplified pattern
 * Validates email format, length constraints, and normalizes input by trimming and lowercasing
 *
 * @param email - The email address to validate (will be sanitized internally)
 * @returns ValidationResult object with isValid boolean and error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateEmail('  user@EXAMPLE.com  ')
 * // Returns: { isValid: true, error: null }
 *
 * const invalid = validateEmail('invalid-email')
 * // Returns: { isValid: false, error: 'Please enter a valid email address' }
 * ```
 */
export function validateEmail(email: string): ValidationResult {
  // Coerce to string and trim whitespace for sanitization
  const sanitizedEmail = String(email || '').trim()

  // Reject empty strings after trimming
  if (!sanitizedEmail) {
    return { isValid: false, error: 'Email is required' }
  }

  // Normalize to lowercase for consistent validation
  const normalizedEmail = sanitizedEmail.toLowerCase()

  // RFC 5322 simplified pattern validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalizedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }

  // RFC 5321 max length check (254 characters)
  if (normalizedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' }
  }

  return { isValid: true, error: null }
}

/**
 * Validate note data before save with comprehensive sanitization and size checking.
 * Sanitizes title and content to prevent XSS attacks, validates required fields,
 * enforces length limits, and uses byte-based size checking for accurate memory limits.
 *
 * @param {Object} note - The note object to validate
 * @param {string} note.title - The note title (required, max 255 chars after sanitization)
 * @param {string} [note.content] - The note content (optional, max 10MB in bytes)
 * @returns {ValidationResult} Validation result with isValid boolean and error message if invalid
 * @throws {Error} If TextEncoder is not available (should not occur in modern browsers)
 * @author Paperlyte Team
 *
 * @example
 * ```typescript
 * // Valid note
 * validateNote({ title: 'My Note', content: 'Note content here' })
 * // Returns: { isValid: true, error: null }
 *
 * // Invalid - empty title
 * validateNote({ title: '   ', content: 'Content' })
 * // Returns: { isValid: false, error: 'Note title is required' }
 *
 * // Invalid - content too large
 * validateNote({ title: 'Large Note', content: 'X'.repeat(11 * 1024 * 1024) })
 * // Returns: { isValid: false, error: 'Note content is too large (maximum 10MB)' }
 * ```
 */
export function validateNote(note: {
  title: string
  content?: string
}): ValidationResult {
  // Use DOMPurify-based sanitization from sanitization.ts for production-grade XSS prevention
  // Note: Direct import is safe here as validation.ts doesn't export functions used by sanitization.ts
  const sanitizedTitle = sanitizeTitle(note.title)
  const sanitizedContent = note.content ? sanitizeContent(note.content) : ''

  // Validate title is not empty after sanitization
  if (!sanitizedTitle || sanitizedTitle.length === 0) {
    return { isValid: false, error: 'Note title is required' }
  }

  // Validate length of sanitized title
  if (sanitizedTitle.length > 255) {
    return {
      isValid: false,
      error: 'Note title must be 255 characters or less',
    }
  }

  // Content is optional but if provided, check byte-based size limits
  if (sanitizedContent && sanitizedContent.length > 0) {
    try {
      // Use TextEncoder for accurate byte-based size checking (UTF-8 encoding)
      const bytes = new TextEncoder().encode(sanitizedContent).length
      const maxBytes = 10 * 1024 * 1024 // 10MB

      if (bytes > maxBytes) {
        return {
          isValid: false,
          error: 'Note content is too large (maximum 10MB)',
        }
      }
    } catch (error) {
      // TextEncoder should be available in all modern browsers, but handle gracefully
      const errorMessage = 'TextEncoder not available for size validation'
      monitoring.logError(error as Error, {
        feature: 'validation',
        action: 'validate_note_content_size',
        additionalData: {
          message: errorMessage,
          contentLength: sanitizedContent.length,
        },
      })
      return {
        isValid: false,
        error: 'Unable to validate content size (technical error)',
      }
    }
  }

  return { isValid: true, error: null }
}

/**
 * Validate waitlist entry with email and name fields.
 * Sanitizes name input by trimming, removing control characters, and collapsing multiple spaces.
 *
 * @param {Object} data - The waitlist entry data to validate
 * @param {string} data.email - The email address to validate
 * @param {string} data.name - The name to validate (will be sanitized)
 * @returns {ValidationResult} Validation result with isValid boolean and error message if invalid
 *
 * @example
 * ```typescript
 * // Valid entry
 * validateWaitlistEntry({ email: 'user@example.com', name: 'John Doe' })
 * // Returns: { isValid: true, error: null }
 *
 * // Invalid - empty name
 * validateWaitlistEntry({ email: 'user@example.com', name: '   ' })
 * // Returns: { isValid: false, error: 'Name is required' }
 *
 * // Invalid - name too long
 * validateWaitlistEntry({ email: 'user@example.com', name: 'A'.repeat(101) })
 * // Returns: { isValid: false, error: 'Name is too long (maximum 100 characters)' }
 * ```
 */
export function validateWaitlistEntry(data: {
  email: string
  name: string
}): ValidationResult {
  // Sanitize name: trim, remove control characters, collapse multiple spaces
  const name = (data.name?.trim() ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space

  if (!name || name.length === 0) {
    return { isValid: false, error: 'Name is required' }
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Name is too long (maximum 100 characters)',
    }
  }

  return validateEmail(data.email)
}

/**
 * Validate file size for uploads against a maximum size limit.
 * Ensures both size and limit parameters are valid finite numbers before comparison.
 *
 * @param size - The file size in bytes to validate (must be finite, non-negative number)
 * @param maxSizeMB - The maximum allowed file size in megabytes (must be finite, non-negative number)
 * @returns ValidationResult object with isValid boolean and error message if invalid
 *
 * @example
 * ```typescript
 * // Valid - file under limit
 * validateFileSize(1024 * 1024, 5) // 1MB file, 5MB limit
 * // Returns: { isValid: true, error: null }
 *
 * // Invalid - file exceeds limit
 * validateFileSize(10 * 1024 * 1024, 5) // 10MB file, 5MB limit
 * // Returns: { isValid: false, error: 'File size must be less than 5MB' }
 *
 * // Invalid - bad size parameter
 * validateFileSize(NaN, 5)
 * // Returns: { isValid: false, error: 'Invalid file size: must be a finite non-negative number' }
 *
 * // Invalid - bad maxSizeMB parameter
 * validateFileSize(1024, -1)
 * // Returns: { isValid: false, error: 'Invalid maximum size: must be a finite non-negative number' }
 * ```
 */
export function validateFileSize(
  size: number,
  maxSizeMB: number
): ValidationResult {
  // Validate size parameter
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    return {
      isValid: false,
      error: 'Invalid file size: must be a finite non-negative number',
    }
  }

  // Validate maxSizeMB parameter
  if (
    typeof maxSizeMB !== 'number' ||
    !Number.isFinite(maxSizeMB) ||
    maxSizeMB < 0
  ) {
    return {
      isValid: false,
      error: 'Invalid maximum size: must be a finite non-negative number',
    }
  }

  // Calculate maximum bytes from MB limit
  const maxBytes = maxSizeMB * 1024 * 1024

  // Compare file size against limit
  if (size > maxBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    }
  }

  return { isValid: true, error: null }
}

/**
 * Validate string length with configurable min/max bounds.
 * Ensures the input is a valid string and that min/max constraints are properly configured.
 *
 * @param value - The string value to validate (will be coerced to string if not already)
 * @param min - Minimum allowed length (must be a finite non-negative integer)
 * @param max - Maximum allowed length (must be a finite positive integer >= min)
 * @param fieldName - The name of the field being validated (used in error messages)
 * @returns ValidationResult object with isValid boolean and error message if invalid
 *
 * @example
 * ```typescript
 * // Valid - string within bounds
 * validateLength('Hello', 3, 10, 'Username')
 * // Returns: { isValid: true, error: null }
 *
 * // Invalid - too short
 * validateLength('Hi', 3, 10, 'Username')
 * // Returns: { isValid: false, error: 'Username must be at least 3 characters' }
 *
 * // Invalid - too long
 * validateLength('VeryLongUsername', 3, 10, 'Username')
 * // Returns: { isValid: false, error: 'Username must be no more than 10 characters' }
 *
 * // Invalid - bad configuration
 * validateLength('test', 10, 5, 'Field')
 * // Returns: { isValid: false, error: 'Invalid length configuration: min (10) must be <= max (5)' }
 * ```
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName = 'Field'
): ValidationResult {
  // Validate and coerce input value to string
  let stringValue: string
  if (typeof value !== 'string') {
    if (value === null || value === undefined) {
      return {
        isValid: false,
        error: `${fieldName} must be a string (received ${value})`,
      }
    }
    // Attempt safe coercion to string for numbers, booleans, etc.
    stringValue = String(value)
  } else {
    stringValue = value
  }

  // Validate min parameter
  if (typeof min !== 'number' || !Number.isFinite(min) || min < 0) {
    return {
      isValid: false,
      error: `Invalid min parameter: must be a finite non-negative number (received ${min})`,
    }
  }

  // Validate max parameter
  if (typeof max !== 'number' || !Number.isFinite(max) || max < 0) {
    return {
      isValid: false,
      error: `Invalid max parameter: must be a finite non-negative number (received ${max})`,
    }
  }

  // Ensure min and max are integers
  const minInt = Math.floor(min)
  const maxInt = Math.floor(max)

  // Validate logical relationship between min and max
  if (minInt > maxInt) {
    return {
      isValid: false,
      error: `Invalid length configuration: min (${minInt}) must be <= max (${maxInt})`,
    }
  }

  // Perform actual length validation
  if (stringValue.length < minInt) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minInt} characters`,
    }
  }

  if (stringValue.length > maxInt) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxInt} characters`,
    }
  }

  return { isValid: true, error: null }
}

/**
 * Generic required field validator that checks if a value is provided and non-empty.
 * Treats null, undefined, and whitespace-only strings as invalid.
 * Numeric 0 and boolean false are considered valid values.
 *
 * @param value - The value to validate (can be any type)
 * @param fieldName - The name of the field being validated (used in error messages)
 * @returns ValidationResult object with isValid boolean and error message if invalid
 *
 * @example
 * ```typescript
 * // Invalid cases
 * validateRequired(null, 'Username')          // { isValid: false, error: 'Username is required' }
 * validateRequired(undefined, 'Email')        // { isValid: false, error: 'Email is required' }
 * validateRequired('', 'Password')            // { isValid: false, error: 'Password is required' }
 * validateRequired('   ', 'Name')             // { isValid: false, error: 'Name is required' }
 *
 * // Valid cases
 * validateRequired('John', 'Name')            // { isValid: true, error: null }
 * validateRequired(0, 'Count')                // { isValid: true, error: null }
 * validateRequired(false, 'IsActive')         // { isValid: true, error: null }
 * validateRequired([], 'Items')               // { isValid: true, error: null }
 * ```
 */
export function validateRequired(
  value: unknown,
  fieldName = 'Field'
): ValidationResult {
  // Check for null or undefined
  if (value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` }
  }

  // For strings, trim and check if empty or whitespace-only
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` }
  }

  return { isValid: true, error: null }
}

/**
 * Validate multiple fields and return the first validation error encountered.
 * Useful for combining multiple validation checks and short-circuiting on first failure.
 *
 * @param {ValidationResult[]} validators - Array of validation results to check
 * @returns {ValidationResult} The first invalid result, or { isValid: true, error: null } if all valid
 *
 * @example
 * ```typescript
 * // All validations pass
 * const result = validateFields([
 *   validateEmail('user@example.com'),
 *   validateLength('password123', 8, 50, 'Password'),
 *   validateRequired('John Doe', 'Name')
 * ])
 * // Returns: { isValid: true, error: null }
 *
 * // First validation fails
 * const result = validateFields([
 *   validateEmail('invalid-email'),
 *   validateLength('abc', 8, 50, 'Password')
 * ])
 * // Returns: { isValid: false, error: 'Please enter a valid email address' }
 *
 * // Second validation fails (first passes)
 * const result = validateFields([
 *   validateEmail('user@example.com'),
 *   validateLength('short', 8, 50, 'Password')
 * ])
 * // Returns: { isValid: false, error: 'Password must be at least 8 characters' }
 * ```
 */
export function validateFields(
  validators: ValidationResult[]
): ValidationResult {
  // Validate input is an array
  if (!Array.isArray(validators)) {
    return {
      isValid: false,
      error: `Invalid validators parameter: expected array, received ${typeof validators}`,
    }
  }

  // Validate array elements are ValidationResult objects
  for (let i = 0; i < validators.length; i++) {
    const validator = validators[i]
    if (
      !validator ||
      typeof validator !== 'object' ||
      typeof validator.isValid !== 'boolean' ||
      (validator.error !== null && typeof validator.error !== 'string')
    ) {
      return {
        isValid: false,
        error: `Invalid validator at index ${i}: must be a ValidationResult object with isValid (boolean) and error (string | null)`,
      }
    }
  }

  // Find first invalid result using Array.find
  const firstInvalid = validators.find(result => !result.isValid)

  // Return first invalid result, or success if all valid
  return firstInvalid ?? { isValid: true, error: null }
}
