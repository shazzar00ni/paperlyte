/**
 * Input sanitization utilities
 * Provides XSS protection and input cleaning
 */

import DOMPurify from 'dompurify'
import { monitoring } from './monitoring'

/**
 * Sanitize note title - remove dangerous characters but preserve readability
 * Prevents XSS while allowing normal text including Unicode
 *
 * @param title - Input title string to sanitize
 * @returns Sanitized title with HTML/scripts removed, truncated to 255 chars, or empty string for invalid input
 */
export function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    monitoring.addBreadcrumb(
      'Title sanitization skipped - invalid input',
      'info',
      {
        inputType: typeof title,
        inputPresent: !!title,
      }
    )
    return ''
  }

  const originalLength = title.length

  monitoring.addBreadcrumb('Starting title sanitization', 'info', {
    originalLength,
  })

  // Remove script tags with their content first
  let sanitized = title.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  )

  const hasScriptTags = sanitized.length !== title.length
  if (hasScriptTags) {
    monitoring.addBreadcrumb('Removed script tags from title', 'warning', {
      originalLength,
      lengthAfterScriptRemoval: sanitized.length,
    })
  }

  // Remove all remaining HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '')

  // Trim and remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.trim().replace(/[\x00-\x1F\x7F]/g, '')

  // Limit length to 255 characters
  const wasTruncated = sanitized.length > 255
  if (wasTruncated) {
    sanitized = sanitized.substring(0, 255)
  }

  monitoring.addBreadcrumb('Title sanitization complete', 'info', {
    originalLength,
    sanitizedLength: sanitized.length,
    wasTruncated,
    hadScriptTags: hasScriptTags,
  })

  return sanitized
}

/**
 * Sanitize note content - remove dangerous HTML/scripts using DOMPurify
 * Provides comprehensive XSS protection by using battle-tested sanitization library
 *
 * @param content - The content string to sanitize
 * @returns Sanitized content with all dangerous HTML/scripts removed
 * @author Paperlyte Team
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }

  // Use DOMPurify for comprehensive, secure HTML sanitization
  // Configure to allow basic formatting tags while removing all dangerous content
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: [], // No attributes allowed - prevents event handlers and dangerous attributes
    KEEP_CONTENT: true, // Preserve text content when removing tags
    ALLOW_DATA_ATTR: false, // Prevent data-* attributes
  })

  return sanitized
}

/**
 * Sanitize HTML - strip all HTML tags
 * Use for converting HTML to plain text
 *
 * @param html - HTML string to strip tags from
 * @returns Plain text string with HTML tags removed, or empty string for invalid input
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return html.replace(/<[^>]*>/g, ' ').trim()
}

/**
 * Sanitize filename - remove invalid filesystem characters
 * Replaces invalid characters with underscores, trims leading/trailing dots and spaces,
 * and limits length to 255 characters
 *
 * @param filename - Original filename to sanitize
 * @returns Sanitized filename safe for filesystem use, or 'untitled' for invalid/empty input
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled'
  }

  // Remove or replace invalid filename characters
  // eslint-disable-next-line no-control-regex
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255)
  }

  return sanitized || 'untitled'
}

/**
 * Sanitize URL - basic URL validation and sanitization
 * Only allows http, https, and mailto protocols to prevent javascript: and data: URI attacks
 *
 * @param url - URL string to validate and sanitize
 * @returns Sanitized URL href if valid with allowed protocol, null for invalid/blocked URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  // Only allow http, https, and mailto protocols
  const allowedProtocols = /^(https?|mailto):/i

  try {
    const urlObj = new URL(url)
    if (!allowedProtocols.test(urlObj.protocol)) {
      // Log blocked URL attempt with protocol information
      monitoring.addBreadcrumb('Blocked URL with invalid protocol', 'warning', {
        event: 'blocked_url',
        reason: 'invalid_protocol',
        protocol: urlObj.protocol,
        // Only log domain, not full URL to avoid exposing sensitive data
        hostname: urlObj.hostname || 'unknown',
      })
      return null
    }
    return urlObj.href
  } catch (error) {
    // Log URL parse failure
    monitoring.addBreadcrumb('URL parsing failed', 'warning', {
      event: 'blocked_url',
      reason: 'parse_error',
      // Only log length and type to avoid exposing sensitive data
      inputLength: url.length,
      inputType: typeof url,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Escape HTML entities
 * Prevents XSS by converting special characters to HTML entities
 *
 * @param text - Input string to escape (returns empty string for falsy/non-string inputs)
 * @returns HTML-escaped string with entities for &, <, >, ", ', /
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, char => map[char])
}

/**
 * Sanitize user input for search queries
 * Prevents injection attacks in search functionality by escaping regex-special characters
 * Returns empty string for falsy/non-string inputs
 *
 * @param query - Input search string to sanitize
 * @returns Sanitized, escaped, and trimmed string limited to 200 characters
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  // Remove special regex characters that could cause errors
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .trim()
    .substring(0, 200) // Limit search query length
}
