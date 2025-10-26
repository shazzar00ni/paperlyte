/**
 * Validation utilities for forms and user input
 */

/**
 * Email validation regex pattern
 * Ensures proper email format: local@domain.ext
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Normalizes email for consistent storage and comparison
 * Trims whitespace and converts to lowercase
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
