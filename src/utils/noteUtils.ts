/**
 * Note utility functions
 *
 * This module provides backwards compatibility while delegating to
 * the consolidated validation and sanitization modules.
 *
 * @deprecated - Import directly from validation.ts and sanitization.ts instead
 */

import {
  sanitizeContent as sanitizeContentNew,
  sanitizeTitle as sanitizeTitleNew,
  stripHtml,
} from './sanitization'
import { validateNote as validateNoteNew } from './validation'

/**
 * Calculate word count from text content
 * Counts words separated by whitespace, excluding HTML tags
 */
export function calculateWordCount(content: string): number {
  if (!content || typeof content !== 'string') {
    return 0
  }

  // Remove HTML tags using stripHtml
  const textOnly = stripHtml(content)

  // Split by whitespace and filter out empty strings
  const words = textOnly
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)

  return words.length
}

/**
 * @deprecated Use sanitization.sanitizeTitle instead
 */
export function sanitizeTitle(title: string): string {
  return sanitizeTitleNew(title)
}

/**
 * @deprecated Use sanitization.sanitizeContent instead
 */
export function sanitizeContent(content: string): string {
  return sanitizeContentNew(content)
}

/**
 * @deprecated Use validation.validateNote instead
 * For backwards compatibility, returns error message or null
 */
export function validateNote(note: {
  title: string
  content?: string
}): string | null {
  const result = validateNoteNew(note)
  return result.isValid ? null : result.error
}
