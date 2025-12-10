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

  // Remove all HTML tags including scripts using DOMPurify
  let sanitized = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] })
  const hadScriptOrHtmlTags = sanitized.length !== title.length
  if (hadScriptOrHtmlTags) {
    monitoring.addBreadcrumb(
      'Removed HTML/script tags from title using DOMPurify',
      'warning',
      {
        originalLength,
        lengthAfterSanitization: sanitized.length,
      }
    )
  }

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
    hadScriptOrHtmlTags: hadScriptOrHtmlTags,
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
    monitoring.addBreadcrumb(
      'Content sanitization skipped - invalid input',
      'info',
      {
        inputType: typeof content,
        inputPresent: !!content,
      }
    )
    return ''
  }

  const originalLength = content.length

  monitoring.addBreadcrumb('Starting content sanitization', 'info', {
    originalLength,
  })

  try {
    // Use DOMPurify for comprehensive, secure HTML sanitization
    // Configure to allow basic formatting tags while removing all dangerous content
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
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

    // Normalize content for comparison by collapsing whitespace and line endings
    const normalize = (str: string) =>
      str.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim()
    const originalNormalized = normalize(content)
    const sanitizedNormalized = normalize(sanitized)
    const contentModified = originalNormalized !== sanitizedNormalized

    monitoring.addBreadcrumb('Content sanitization complete', 'info', {
      originalLength,
      sanitizedLength: sanitized.length,
      contentModified,
    })

    return sanitized
  } catch (error) {
    const errorObj =
      error instanceof Error
        ? error
        : new Error('DOMPurify sanitization failed')

    monitoring.logError(errorObj, {
      feature: 'sanitization',
      action: 'sanitize_content',
      additionalData: {
        originalLength,
        errorMessage: errorObj.message,
      },
    })

    monitoring.addBreadcrumb(
      'Content sanitization failed - returning empty string',
      'error',
      {
        originalLength,
        errorMessage: errorObj.message,
      }
    )

    // Return empty string on error for safety (fail secure)
    return ''
  }
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
    monitoring.addBreadcrumb('HTML stripping skipped - invalid input', 'info', {
      inputType: typeof html,
      inputPresent: !!html,
    })
    return ''
  }

  const originalLength = html.length
  monitoring.addBreadcrumb('Starting HTML tag stripping', 'info', {
    originalLength,
  })

  // Use DOMPurify to safely strip all HTML tags including script tags with content
  // This is more secure than regex-based tag removal
  const stripped = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No tags allowed - strip everything
    KEEP_CONTENT: true, // Preserve text content when removing tags
  }).trim()

  monitoring.addBreadcrumb('HTML tag stripping complete', 'info', {
    originalLength,
    strippedLength: stripped.length,
    tagsRemoved: originalLength !== stripped.length,
  })

  return stripped
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
    monitoring.addBreadcrumb(
      'Filename sanitization skipped - invalid input',
      'info',
      {
        inputType: typeof filename,
        inputPresent: !!filename,
      }
    )
    return 'untitled'
  }

  const originalLength = filename.length
  monitoring.addBreadcrumb('Starting filename sanitization', 'info', {
    originalLength,
  })

  // Remove or replace invalid filename characters
  // eslint-disable-next-line no-control-regex
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

  const hadInvalidChars = sanitized !== filename

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Limit length
  const wasTruncated = sanitized.length > 255
  if (wasTruncated) {
    sanitized = sanitized.substring(0, 255)
  }

  const usedFallback = !sanitized
  if (usedFallback) {
    sanitized = 'untitled'
  }

  monitoring.addBreadcrumb('Filename sanitization complete', 'info', {
    originalLength,
    sanitizedLength: sanitized.length,
    hadInvalidChars,
    wasTruncated,
    usedFallback,
  })

  return sanitized
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
    monitoring.addBreadcrumb('HTML escaping skipped - invalid input', 'info', {
      inputType: typeof text,
      inputPresent: !!text,
    })
    return ''
  }

  const originalLength = text.length
  monitoring.addBreadcrumb('Starting HTML entity escaping', 'info', {
    originalLength,
  })

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  const escaped = text.replace(/[&<>"'/]/g, char => map[char])

  monitoring.addBreadcrumb('HTML entity escaping complete', 'info', {
    originalLength,
    escapedLength: escaped.length,
    entitiesEscaped: escaped.length !== originalLength,
  })

  return escaped
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
    monitoring.addBreadcrumb(
      'Search query sanitization skipped - invalid input',
      'info',
      {
        inputType: typeof query,
        inputPresent: !!query,
      }
    )
    return ''
  }

  const originalLength = query.length
  monitoring.addBreadcrumb('Starting search query sanitization', 'info', {
    originalLength,
  })

  // Remove special regex characters that could cause errors
  const sanitized = query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .trim()
    .substring(0, 200) // Limit search query length

  monitoring.addBreadcrumb('Search query sanitization complete', 'info', {
    originalLength,
    sanitizedLength: sanitized.length,
    wasTruncated: originalLength > 200,
    specialCharsEscaped: sanitized !== query,
  })

  return sanitized
}
