/**
 * Utility functions for note operations
 */

/**
 * Calculate word count from text content
 * Counts words separated by whitespace, excluding HTML tags
 */
export function calculateWordCount(content: string): number {
  if (!content || typeof content !== 'string') {
    return 0
  }

  // Remove HTML tags if any
  const textOnly = content.replace(/<[^>]*>/g, ' ')

  // Split by whitespace and filter out empty strings
  const words = textOnly
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)

  return words.length
}

/**
 * Sanitize note title - remove dangerous characters but preserve readability
 * Prevents XSS while allowing normal text including Unicode
 */
export function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return ''
  }

  // Remove script tags with their content first
  let sanitized = title.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  )

  // Remove all remaining HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '')

  // Trim and remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.trim().replace(/[\x00-\x1F\x7F]/g, '')

  // Limit length to 255 characters
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255)
  }

  return sanitized
}

/**
 * Sanitize note content - remove dangerous scripts but preserve formatting
 * Allows basic HTML formatting tags if needed in the future
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }

  // Remove script tags and their content
  let sanitized = content.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  )

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  return sanitized
}

/**
 * Validate note data before save
 * Returns error message if invalid, null if valid
 */
export function validateNote(note: {
  title: string
  content?: string
}): string | null {
  if (!note.title || note.title.trim().length === 0) {
    return 'Note title is required'
  }

  if (note.title.length > 255) {
    return 'Note title must be 255 characters or less'
  }

  // Content is optional but if provided, check reasonable limits
  if (note.content && note.content.length > 10 * 1024 * 1024) {
    // 10MB limit for content
    return 'Note content is too large (maximum 10MB)'
  }

  return null
}
