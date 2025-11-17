/**
 * Security Utilities Module
 *
 * Provides comprehensive security utilities including:
 * - Rate limiting for client-side actions
 * - CSRF token generation and validation
 * - Secure session management
 * - Input sanitization helpers
 * - Security header validation
 *
 * @module security
 */

import DOMPurify from 'dompurify'
import { monitoring } from './monitoring'

/**
 * Rate Limiter Configuration
 */
interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs?: number
}

/**
 * Rate Limiter for client-side actions
 * Prevents abuse by tracking action attempts per time window
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private blockedUntil: Map<string, number> = new Map()

  /**
   * Check if an action is allowed based on rate limiting rules
   * @param key Unique identifier for the action (e.g., 'form_submit_waitlist')
   * @param config Rate limit configuration
   * @returns true if action is allowed, false if rate limited
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()

    // Check if currently blocked
    const blockedUntil = this.blockedUntil.get(key)
    if (blockedUntil && now < blockedUntil) {
      monitoring.addBreadcrumb('Rate limit blocked', 'security', {
        key,
        blockedFor: blockedUntil - now,
      })
      return false
    }

    // Clean up expired block
    if (blockedUntil && now >= blockedUntil) {
      this.blockedUntil.delete(key)
    }

    // Get or initialize attempts array
    let attempts = this.attempts.get(key) || []

    // Remove attempts outside the time window
    const windowStart = now - config.windowMs
    attempts = attempts.filter(timestamp => timestamp > windowStart)

    // Check if limit exceeded
    if (attempts.length >= config.maxAttempts) {
      // Block for specified duration
      if (config.blockDurationMs) {
        this.blockedUntil.set(key, now + config.blockDurationMs)
      }

      monitoring.addBreadcrumb('Rate limit exceeded', 'security', {
        key,
        attempts: attempts.length,
        maxAttempts: config.maxAttempts,
      })

      return false
    }

    // Record this attempt
    attempts.push(now)
    this.attempts.set(key, attempts)

    return true
  }

  /**
   * Manually reset rate limiting for a key
   * @param key Action identifier to reset
   */
  reset(key: string): void {
    this.attempts.delete(key)
    this.blockedUntil.delete(key)
  }

  /**
   * Get remaining attempts before rate limit
   * @param key Action identifier
   * @param config Rate limit configuration
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(key: string, config: RateLimitConfig): number {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const windowStart = now - config.windowMs
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart)
    return Math.max(0, config.maxAttempts - recentAttempts.length)
  }
}

/**
 * CSRF Token Manager
 * Generates and validates CSRF tokens for state-changing operations
 */
class CSRFTokenManager {
  private static readonly TOKEN_KEY = 'paperlyte_csrf_token'
  private static readonly TOKEN_EXPIRY_MS = 3600000 // 1 hour
  private inMemoryToken: { token: string; expiry: number } | null = null

  /**
   * Generate a new CSRF token
   * @returns CSRF token string
   */
  generateToken(): string {
    // Generate cryptographically secure random token
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const token = Array.from(array, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('')

    // Store token with expiry
    const tokenData = {
      token,
      expiry: Date.now() + CSRFTokenManager.TOKEN_EXPIRY_MS,
    }

    try {
      sessionStorage.setItem(
        CSRFTokenManager.TOKEN_KEY,
        JSON.stringify(tokenData)
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'csrf_token_generation',
      })
      // Fallback to in-memory storage with session scope
      this.inMemoryToken = tokenData
      return token
    }

    return token
  }

  /**
   * Get the current CSRF token
   * @returns Current token or null if expired/missing
   */
  getToken(): string | null {
    try {
      const stored = sessionStorage.getItem(CSRFTokenManager.TOKEN_KEY)
      if (!stored) {
        // Check in-memory fallback
        if (this.inMemoryToken && this.inMemoryToken.expiry > Date.now()) {
          return this.inMemoryToken.token
        }
        return null
      }

      const tokenData = JSON.parse(stored)
      if (tokenData.expiry < Date.now()) {
        this.clearToken()
        return null
      }

      return tokenData.token
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'csrf_token_retrieval',
      })
      // Check in-memory fallback
      if (this.inMemoryToken && this.inMemoryToken.expiry > Date.now()) {
        return this.inMemoryToken.token
      }
      return null
    }
  }

  /**
   * Validate a CSRF token
   * @param token Token to validate
   * @returns true if valid, false otherwise
   */
  validateToken(token: string): boolean {
    const storedToken = this.getToken()
    if (!storedToken) {
      monitoring.addBreadcrumb('CSRF token missing', 'security')
      return false
    }

    const isValid = storedToken === token
    if (!isValid) {
      monitoring.addBreadcrumb('CSRF token mismatch', 'security')
    }

    return isValid
  }

  /**
   * Clear the current CSRF token
   */
  clearToken(): void {
    try {
      sessionStorage.removeItem(CSRFTokenManager.TOKEN_KEY)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'csrf_token_clear',
      })
    }
    // Also clear in-memory fallback
    this.inMemoryToken = null
  }
}

/**
 * Secure Session Manager
 * Handles secure session storage and validation
 */
class SecureSessionManager {
  private static readonly SESSION_KEY = 'paperlyte_session'
  private static readonly SESSION_TIMEOUT_MS = 86400000 // 24 hours
  private static readonly IDLE_TIMEOUT_MS = 1800000 // 30 minutes

  private sessionData: Record<string, unknown> | null = null

  /**
   * Initialize or restore a session
   * @param data Optional session data to store
   * @returns true if session is active, false otherwise
   */
  initSession(data?: Record<string, unknown>): boolean {
    try {
      if (data) {
        const sessionInfo = {
          data,
          created: Date.now(),
          lastActivity: Date.now(),
        }

        sessionStorage.setItem(
          SecureSessionManager.SESSION_KEY,
          JSON.stringify(sessionInfo)
        )

        this.sessionData = data
        return true
      }

      // Restore existing session
      const stored = sessionStorage.getItem(SecureSessionManager.SESSION_KEY)
      if (!stored) return false

      const sessionInfo = JSON.parse(stored)
      const now = Date.now()

      // Check session timeout
      if (now - sessionInfo.created > SecureSessionManager.SESSION_TIMEOUT_MS) {
        this.clearSession()
        monitoring.addBreadcrumb('Session expired (timeout)', 'security')
        return false
      }

      // Check idle timeout
      if (
        now - sessionInfo.lastActivity >
        SecureSessionManager.IDLE_TIMEOUT_MS
      ) {
        this.clearSession()
        monitoring.addBreadcrumb('Session expired (idle)', 'security')
        return false
      }

      // Update last activity
      sessionInfo.lastActivity = now
      sessionStorage.setItem(
        SecureSessionManager.SESSION_KEY,
        JSON.stringify(sessionInfo)
      )

      this.sessionData = sessionInfo.data
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'session_init',
      })
      return false
    }
  }

  /**
   * Update session activity timestamp
   * Should be called on user interactions
   */
  updateActivity(): void {
    try {
      const stored = sessionStorage.getItem(SecureSessionManager.SESSION_KEY)
      if (!stored) return

      const sessionInfo = JSON.parse(stored)
      sessionInfo.lastActivity = Date.now()

      sessionStorage.setItem(
        SecureSessionManager.SESSION_KEY,
        JSON.stringify(sessionInfo)
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'session_activity_update',
      })
    }
  }

  /**
   * Get current session data
   * @returns Session data or null if no active session
   */
  getSession(): Record<string, unknown> | null {
    if (this.initSession()) {
      return this.sessionData
    }
    return null
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SecureSessionManager.SESSION_KEY)
      this.sessionData = null
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'session_clear',
      })
    }
  }

  /**
   * Check if session is still valid
   * @returns true if session is active and valid
   */
  isSessionValid(): boolean {
    return this.initSession()
  }
}

/**
 * Enhanced input sanitization utilities
 */
export const sanitization = {
  /**
   * Sanitize HTML content using DOMPurify with strict settings
   * @param html HTML content to sanitize
   * @param allowedTags Optional array of allowed HTML tags
   * @returns Sanitized HTML string
   */
  sanitizeHTML(html: string, allowedTags?: string[]): string {
    if (!html || typeof html !== 'string') return ''

    const config = allowedTags
      ? { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: [] }
      : {
          ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br'],
          ALLOWED_ATTR: [],
        }

    try {
      return DOMPurify.sanitize(html, config)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'html_sanitization',
      })
      // Return empty string on error to be safe
      return ''
    }
  },

  /**
   * Sanitize text by removing all HTML and dangerous characters
   * Note: For HTML content, use sanitizeHTML() with DOMPurify instead
   * @param text Text to sanitize
   * @returns Plain text with dangerous content removed
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return ''

    // Use DOMPurify to strip all HTML first (most secure approach)
    let sanitized = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Strip all tags
      ALLOWED_ATTR: [], // Strip all attributes
    })

    // Remove control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

    // Remove dangerous URL schemes (including data:, javascript:, vbscript:)
    sanitized = sanitized.replace(
      /(?:javascript|vbscript|data|file|about):/gi,
      ''
    )

    // Remove event handler patterns
    sanitized = sanitized.replace(/on\w+\s*=/gi, '')

    return sanitized.trim()
  },

  /**
   * Sanitize and validate email address
   * @param email Email address to validate
   * @returns Sanitized email or null if invalid
   */
  sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null

    // Basic sanitization
    const sanitized = email.trim().toLowerCase()

    // Validate email format with international support
    // Supports international characters, special chars, and modern TLDs
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(sanitized)) return null

    // Additional security checks
    if (sanitized.includes('..')) return null // No consecutive dots
    if (sanitized.startsWith('.') || sanitized.endsWith('.')) return null

    return sanitized
  },

  /**
   * Sanitize URL to prevent XSS
   * @param url URL to sanitize
   * @returns Sanitized URL or null if invalid/dangerous
   */
  sanitizeURL(url: string, allowDataURLs: boolean = false): string | null {
    if (!url || typeof url !== 'string') return null

    const trimmed = url.trim()
    const lowerURL = trimmed.toLowerCase()

    // Block dangerous protocols (javascript:, vbscript:, file:, about:)
    // Note: data: URLs are handled separately below with strict validation
    const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'about:']
    if (dangerousProtocols.some(protocol => lowerURL.startsWith(protocol))) {
      monitoring.addBreadcrumb('Dangerous URL protocol blocked', 'security', {
        url: trimmed.substring(0, 20),
      })
      return null
    }

    // Handle data: URLs with strict validation (controlled by allowDataURLs parameter)
    if (lowerURL.startsWith('data:')) {
      if (!allowDataURLs) {
        monitoring.addBreadcrumb('Data URL blocked', 'security', {
          url: trimmed.substring(0, 30),
        })
        return null
      }
      // Allow only safe data URL types (images, SVG)
      if (
        !lowerURL.startsWith('data:image/') &&
        !lowerURL.startsWith('data:svg+xml,')
      ) {
        return null
      }
    }

    // Only allow http, https, data (conditionally), and relative URLs
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:') &&
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('./')
    ) {
      return null
    }

    return trimmed
  },
}

/**
 * Security header validation utilities
 */
export const securityHeaders = {
  /**
   * Validate that required security headers are present
   * Useful for monitoring and testing
   * @returns Object with validation results
   */
  async validateHeaders(): Promise<{
    valid: boolean
    missing: string[]
    present: string[]
  }> {
    const requiredHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'content-security-policy',
    ]

    const present: string[] = []
    const missing: string[] = []

    try {
      // Make a fetch request to check headers
      const response = await fetch(window.location.href, { method: 'HEAD' })

      requiredHeaders.forEach(header => {
        if (response.headers.has(header)) {
          present.push(header)
        } else {
          missing.push(header)
        }
      })

      return {
        valid: missing.length === 0,
        missing,
        present,
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'security',
        action: 'header_validation',
      })
      return {
        valid: false,
        missing: requiredHeaders,
        present: [],
      }
    }
  },
}

// Export singleton instances
export const rateLimiter = new RateLimiter()
export const csrfTokenManager = new CSRFTokenManager()
export const sessionManager = new SecureSessionManager()

// Export common rate limit configs
export const RATE_LIMITS = {
  FORM_SUBMIT: { maxAttempts: 5, windowMs: 60000, blockDurationMs: 300000 }, // 5 attempts per minute, block 5 min
  API_CALL: { maxAttempts: 30, windowMs: 60000, blockDurationMs: 60000 }, // 30 per minute, block 1 min
  LOGIN_ATTEMPT: { maxAttempts: 5, windowMs: 300000, blockDurationMs: 900000 }, // 5 per 5 min, block 15 min
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 3600000,
    blockDurationMs: 3600000,
  }, // 3 per hour, block 1 hour
}
