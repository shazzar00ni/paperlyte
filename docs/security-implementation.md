# Security Implementation Guide

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Status:** Implementation Complete

## Overview

This document provides a comprehensive guide for implementing and using the security features in the Paperlyte application. All developers should be familiar with these security utilities and best practices.

---

## Security Headers

### Production Deployment

All deployment platforms (Netlify, Vercel) are configured with strict security headers:

#### HSTS (HTTP Strict Transport Security)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- Forces HTTPS for 1 year
- Applies to all subdomains
- Eligible for browser HSTS preload list

#### Content Security Policy (CSP)

```
Content-Security-Policy: default-src 'self';
  script-src 'self' https://app.posthog.com https://*.ingest.sentry.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://app.posthog.com https://*.ingest.sentry.io https://*.sentry.io;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

**Key directives:**

- `default-src 'self'` - Only load resources from same origin
- `script-src` - Whitelisted external scripts (analytics only)
- `object-src 'none'` - No Flash, Java, or other plugins
- `frame-ancestors 'none'` - Prevents clickjacking
- `upgrade-insecure-requests` - Auto-upgrade HTTP to HTTPS

**Development vs Production CSP:**

- Development includes `'unsafe-inline'` and `'unsafe-eval'` for Vite HMR
- Production uses strict CSP without unsafe directives
- Consider implementing nonce-based CSP for even stronger protection

#### Permissions Policy

```
Permissions-Policy: geolocation=(), microphone=(), camera=(),
  payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

Restricts access to browser APIs to prevent fingerprinting and privacy violations.

#### Other Headers

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection (deprecated, CSP is the modern approach)
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

**Note on X-XSS-Protection:** This header is deprecated and potentially harmful in modern browsers. We include it for legacy browser support, but rely primarily on our strict CSP for XSS protection.

### Verification

After deployment, verify headers using:

- https://securityheaders.com/
- Browser DevTools Network tab
- `curl -I https://yourdomain.com`

---

## Security Utilities

### Rate Limiting

**Purpose:** Prevent abuse by limiting action frequency per user.

#### Basic Usage

```typescript
import { rateLimiter, RATE_LIMITS } from '@/utils/security'

// In your form submit handler
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Check if action is allowed
  if (!rateLimiter.isAllowed('form_submit', RATE_LIMITS.FORM_SUBMIT)) {
    setError('Too many attempts. Please try again later.')
    return
  }

  // Process form...
}
```

#### Predefined Rate Limit Configurations

```typescript
RATE_LIMITS.FORM_SUBMIT
// 5 attempts per minute, block for 5 minutes if exceeded
// Use for: Waitlist, contact forms, feedback forms

RATE_LIMITS.LOGIN_ATTEMPT
// 5 attempts per 5 minutes, block for 15 minutes if exceeded
// Use for: Login, password reset initiation

RATE_LIMITS.API_CALL
// 30 attempts per minute, block for 1 minute if exceeded
// Use for: API calls, data fetching

RATE_LIMITS.PASSWORD_RESET
// 3 attempts per hour, block for 1 hour if exceeded
// Use for: Password reset, account recovery
```

#### Custom Rate Limits

```typescript
const customLimit = {
  maxAttempts: 10,
  windowMs: 60000, // 1 minute window
  blockDurationMs: 120000, // Block for 2 minutes
}

if (!rateLimiter.isAllowed('custom_action', customLimit)) {
  // Handle rate limit
}
```

#### Checking Remaining Attempts

```typescript
const remaining = rateLimiter.getRemainingAttempts(
  'action_key',
  RATE_LIMITS.FORM_SUBMIT
)
console.log(`You have ${remaining} attempts remaining`)
```

#### Resetting Rate Limits

```typescript
// Reset after successful completion or admin action
rateLimiter.reset('action_key')
```

---

### CSRF Protection

**Purpose:** Protect against Cross-Site Request Forgery attacks.

#### Token Generation

```typescript
import { csrfTokenManager } from '@/utils/security'

// Generate token when form is loaded
const [csrfToken, setCsrfToken] = useState('')

useEffect(() => {
  const token = csrfTokenManager.generateToken()
  setCsrfToken(token)
}, [])
```

#### Token Validation

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Validate CSRF token
  if (!csrfTokenManager.validateToken(csrfToken)) {
    setError('Security validation failed. Please refresh and try again.')
    return
  }

  // Process form...
}
```

#### Including Token in API Requests

```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
})
```

#### Token Lifecycle

- Tokens expire after 1 hour
- Store in sessionStorage (cleared on tab close)
- Generate new token for each session
- Clear token on logout

---

### Secure Session Management

**Purpose:** Manage user sessions with automatic timeout and idle detection.

#### Initializing a Session

```typescript
import { sessionManager } from '@/utils/security'

// After successful login
const sessionData = {
  userId: user.id,
  email: user.email,
  role: user.role,
}

sessionManager.initSession(sessionData)
```

#### Checking Session Validity

```typescript
// In protected routes or components
useEffect(() => {
  if (!sessionManager.isSessionValid()) {
    // Redirect to login
    navigate('/login')
  }
}, [])
```

#### Getting Session Data

```typescript
const sessionData = sessionManager.getSession()
if (sessionData) {
  const userId = sessionData.userId
  // Use session data...
}
```

#### Updating Activity

```typescript
// Call on user interactions to prevent idle timeout
const handleUserAction = () => {
  sessionManager.updateActivity()
  // Handle action...
}
```

#### Clearing Session

```typescript
// On logout
const handleLogout = () => {
  sessionManager.clearSession()
  navigate('/login')
}
```

#### Session Timeouts

- **Absolute timeout:** 24 hours (session expires regardless of activity)
- **Idle timeout:** 30 minutes (session expires after inactivity)

---

### Input Sanitization

**Purpose:** Prevent XSS and injection attacks by cleaning user input.

#### HTML Sanitization

```typescript
import { sanitization } from '@/utils/security'

// Sanitize HTML content with DOMPurify
const userHTML = '<p>Safe content</p><script>alert("XSS")</script>'
const clean = sanitization.sanitizeHTML(userHTML)
// Result: '<p>Safe content</p>' (script removed)

// With custom allowed tags
const cleanCustom = sanitization.sanitizeHTML(userHTML, ['p', 'strong', 'em'])
```

#### Text Sanitization

```typescript
// Remove all HTML and dangerous content
const userInput = '<script>alert("XSS")</script>Hello World'
const cleanText = sanitization.sanitizeText(userInput)
// Result: 'Hello World'
```

#### Email Sanitization

```typescript
// Validate and sanitize email addresses
const email = '  User@Example.COM  '
const cleanEmail = sanitization.sanitizeEmail(email)
// Result: 'user@example.com' or null if invalid

// Handles validation automatically
const invalidEmail = sanitization.sanitizeEmail('not-an-email')
// Result: null
```

#### URL Sanitization

```typescript
// Validate and sanitize URLs, block dangerous protocols
const safeURL = sanitization.sanitizeURL('https://example.com')
// Result: 'https://example.com'

const dangerousURL = sanitization.sanitizeURL('javascript:alert("XSS")')
// Result: null (blocked)

// Allow data URLs for images (e.g., inline SVGs)
const dataURL = sanitization.sanitizeURL('data:image/svg+xml,...', true)
// Result: sanitized data URL (if valid image type)

// Dangerous data URLs are still blocked
const badDataURL = sanitization.sanitizeURL('data:text/html,...', true)
// Result: null (blocked)

// Allowed protocols: http://, https://, /, ./, data: (conditionally)
```

---

## Implementation Examples

### Example 1: Secure Form Component

```typescript
import React, { useState, useEffect } from 'react'
import {
  rateLimiter,
  csrfTokenManager,
  sanitization,
  RATE_LIMITS
} from '@/utils/security'

const SecureForm: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [csrfToken, setCsrfToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Generate CSRF token on mount
    setCsrfToken(csrfTokenManager.generateToken())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // 1. Check rate limiting
      if (!rateLimiter.isAllowed('form_submit', RATE_LIMITS.FORM_SUBMIT)) {
        throw new Error('Too many attempts. Please try again later.')
      }

      // 2. Validate CSRF token
      if (!csrfTokenManager.validateToken(csrfToken)) {
        throw new Error('Security validation failed.')
      }

      // 3. Sanitize inputs
      const sanitizedEmail = sanitization.sanitizeEmail(formData.email)
      if (!sanitizedEmail) {
        throw new Error('Invalid email address')
      }

      const sanitizedName = sanitization.sanitizeText(formData.name)
      if (!sanitizedName) {
        throw new Error('Invalid name')
      }

      // 4. Submit data
      await submitForm({
        name: sanitizedName,
        email: sanitizedEmail,
        csrfToken
      })

      // 5. Reset form
      setFormData({ name: '', email: '' })
      setCsrfToken(csrfTokenManager.generateToken())

    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input type="hidden" value={csrfToken} />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  )
}
```

### Example 2: Protected Route Component

```typescript
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionManager } from '@/utils/security'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()

  useEffect(() => {
    // Check session validity on mount
    if (!sessionManager.isSessionValid()) {
      navigate('/login')
      return
    }

    // Set up activity tracking
    const handleActivity = () => {
      sessionManager.updateActivity()
    }

    // Track various user activities
    window.addEventListener('click', handleActivity)
    window.addEventListener('keypress', handleActivity)
    window.addEventListener('scroll', handleActivity)

    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keypress', handleActivity)
      window.removeEventListener('scroll', handleActivity)
    }
  }, [navigate])

  return <>{children}</>
}
```

### Example 3: Rich Text Editor with Sanitization

```typescript
import React, { useCallback } from 'react'
import { sanitization } from '@/utils/security'

const SafeRichTextEditor: React.FC = () => {
  const handleContentChange = useCallback((html: string) => {
    // Sanitize HTML before saving
    const sanitizedHTML = sanitization.sanitizeHTML(html, [
      'p', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'br'
    ])

    // Save sanitized content
    saveContent(sanitizedHTML)
  }, [])

  return (
    <div
      contentEditable
      onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
    />
  )
}
```

---

## Testing Security Features

### Unit Tests

All security utilities have comprehensive test coverage:

```bash
npm run test -- src/utils/__tests__/security.test.ts
```

Test coverage includes:

- Rate limiting with various configurations
- CSRF token generation and validation
- Session management with timeouts
- All sanitization functions
- Edge cases and error handling

### Integration Tests

Security features are tested in integration:

```bash
npm run test -- tests/integration/security.test.tsx
```

### Manual Testing Checklist

- [ ] Verify security headers using securityheaders.com
- [ ] Test rate limiting by rapid form submissions
- [ ] Verify CSRF protection by manipulating tokens
- [ ] Test session timeout by waiting 30+ minutes
- [ ] Attempt XSS attacks with malicious input
- [ ] Test dangerous URL protocols
- [ ] Verify email validation with edge cases

---

## Security Best Practices

### DO ✅

1. **Always sanitize user input** before storage or display
2. **Use rate limiting** on all forms and API endpoints
3. **Validate CSRF tokens** for state-changing operations
4. **Update session activity** on user interactions
5. **Use HTTPS** in all environments (enforced via HSTS)
6. **Keep dependencies updated** (automated via Dependabot)
7. **Log security events** for monitoring and audit trails
8. **Validate on both client and server** (when API is added in Q4 2025)

### DON'T ❌

1. **Never trust user input** - always sanitize and validate
2. **Don't store sensitive data** in localStorage (use sessionStorage)
3. **Don't expose internal errors** to users - use generic messages
4. **Don't disable security features** in production
5. **Don't hardcode secrets** - use environment variables
6. **Don't use inline scripts** - violates CSP
7. **Don't bypass rate limiting** for testing in production
8. **Don't skip CSRF validation** for "convenience"

---

## Dependency Security

### Automated Updates

Dependabot is configured to check for security updates weekly:

```yaml
# .github/dependabot.yml
updates:
  - package-ecosystem: 'npm'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'security'
```

### Manual Security Checks

```bash
# Check for vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Fix vulnerabilities automatically
npm audit fix
```

### Security Monitoring

- **npm audit** runs in CI/CD pipeline
- **Dependabot alerts** for vulnerabilities
- **Renovate** (optional) for automated updates
- **Snyk** (optional) for advanced scanning

---

## Future Enhancements (Q4 2025 API Migration)

When migrating to a backend API:

1. **Server-side validation** - Validate all inputs server-side
2. **Rate limiting middleware** - Implement server-side rate limiting
3. **CSRF tokens** - Validate tokens server-side
4. **Session management** - Use secure HTTP-only cookies
5. **JWT tokens** - Implement token-based authentication
6. **API security** - Add API keys, OAuth, or other auth mechanisms
7. **Logging and monitoring** - Track security events server-side
8. **WAF** - Consider Web Application Firewall

---

## Support and Questions

For security questions or concerns:

- Review this documentation
- Check test files for examples
- Consult security audit reports in `/docs`
- Contact the security team

**Remember:** Security is everyone's responsibility. When in doubt, err on the side of caution.
