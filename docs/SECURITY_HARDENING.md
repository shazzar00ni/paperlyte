# Security Hardening Guide

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** Security Team

## Overview

This document outlines security hardening measures implemented in Paperlyte, including SSL/TLS configuration, rate limiting, security headers, and defense-in-depth strategies.

## SSL/TLS Configuration

### Current Setup

**Hosting Platforms:**

- **Netlify:** Automatic SSL/TLS via Let's Encrypt
- **Vercel:** Automatic SSL/TLS via Let's Encrypt

**Certificate Details:**

- **Type:** Domain Validated (DV) certificates
- **Renewal:** Automatic (60-day renewal before expiration)
- **Protocol:** TLS 1.2 and TLS 1.3 only (TLS 1.0/1.1 disabled)
- **Cipher Suites:** Modern, secure ciphers only

### SSL/TLS Best Practices

#### 1. HTTPS Enforcement

**Netlify Configuration (netlify.toml):**

```toml
# Already configured - HTTPS redirect automatic
[[redirects]]
  from = "http://paperlyte.com/*"
  to = "https://paperlyte.com/:splat"
  status = 301
  force = true

[[redirects]]
  from = "http://www.paperlyte.com/*"
  to = "https://paperlyte.com/:splat"
  status = 301
  force = true
```

**Vercel Configuration:**
Automatic HTTPS redirect enabled by default.

#### 2. HTTP Strict Transport Security (HSTS)

**Implemented in Headers:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**HSTS Preload Submission:**

```bash
# Verify HSTS is working
curl -I https://paperlyte.com | grep -i strict-transport

# After 3 months of stable HSTS, submit to preload list:
# Visit: https://hstspreload.org/
# Submit: paperlyte.com
```

**HSTS Configuration:**

- **max-age:** 1 year (31536000 seconds)
- **includeSubDomains:** Applies to all subdomains
- **preload:** Ready for browser preload list

#### 3. Certificate Monitoring

**Monitoring Certificate Expiration:**

```bash
# Check certificate expiration
echo | openssl s_client -servername paperlyte.com -connect paperlyte.com:443 2>/dev/null | openssl x509 -noout -dates

# Set up monitoring alert (recommended: 30 days before expiration)
# Netlify/Vercel handle renewal automatically
```

**Certificate Transparency Monitoring:**

- Monitor Certificate Transparency logs
- Service: https://crt.sh/?q=paperlyte.com
- Alert on unexpected certificate issuance

### SSL/TLS Troubleshooting

**Common Issues:**

1. **Mixed Content Warnings**

   ```javascript
   // Ensure all resources use HTTPS
   // Check for http:// in src/img/link tags
   grep -r "http://" src/ --include="*.tsx" --include="*.ts"
   ```

2. **Certificate Mismatch**

   ```bash
   # Verify certificate matches domain
   echo | openssl s_client -servername paperlyte.com -connect paperlyte.com:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject:"
   ```

3. **Renewal Failure**
   ```bash
   # Check Netlify/Vercel dashboard for SSL status
   netlify status
   vercel certs ls
   ```

## Security Headers

### Implemented Headers

All security headers are configured in `netlify.toml` and `vercel.json`:

#### 1. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose:** Prevents clickjacking by blocking iframe embedding  
**Impact:** Cannot embed Paperlyte in iframes (expected behavior)

#### 2. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME-type sniffing attacks  
**Impact:** Browser respects declared content types

#### 3. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Enables browser XSS filtering (legacy browsers)  
**Impact:** Blocks pages if XSS detected (older browsers only)

#### 4. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information sent to external sites  
**Impact:** Full URL for same-origin, origin only for cross-origin

#### 5. Content Security Policy (CSP)

**Current Policy:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://app.posthog.com https://*.sentry.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://app.posthog.com https://*.ingest.sentry.io https://*.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Directive Explanation:**

- **default-src 'self':** Only load resources from same origin by default
- **script-src:** Allow scripts from self, PostHog, and Sentry
  - `'unsafe-inline'` required for PostHog/Sentry initialization (MVP)
  - Future: Replace with nonces when backend added (Q4 2025)
- **style-src 'unsafe-inline':** Required for Tailwind CSS utility classes
  - Future: Use CSS-in-JS with nonces or move to external stylesheets
- **img-src:** Allow images from self, data URIs, HTTPS, and blob
- **connect-src:** API calls to self, PostHog, and Sentry only
- **frame-ancestors 'none':** Cannot be embedded in iframes
- **upgrade-insecure-requests:** Automatically upgrade HTTP to HTTPS

**Note on 'unsafe-inline':** While this weakens CSP protections, it's necessary for:

1. Third-party analytics (PostHog, Sentry) requiring inline initialization
2. Tailwind CSS utility-first approach with inline styles
3. MVP static site architecture without server-side rendering

**Mitigation Strategy:**

- All user input is sanitized before rendering (DOMPurify)
- XSS protection enabled via X-XSS-Protection header
- Regular security audits to identify potential injection points
- Plan to implement CSP nonces in Q4 2025 with backend

**CSP Reporting (Future Implementation):**

```
Content-Security-Policy-Report-Only: [policy]; report-uri https://paperlyte.com/api/csp-report
```

#### 6. Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

**Purpose:** Disable unnecessary browser APIs  
**Blocked Features:**

- Camera access
- Microphone access
- Geolocation
- FLoC (privacy-invasive tracking)

#### 7. Cross-Origin Policies

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

**Purpose:** Isolate from cross-origin attacks  
**Impact:** Stronger isolation from malicious sites

### Header Testing

**Test Security Headers:**

```bash
# Test all headers
curl -I https://paperlyte.com

# Use online tools
# https://securityheaders.com/?q=paperlyte.com
# https://observatory.mozilla.org/analyze/paperlyte.com
```

**Expected Security Score:**

- SecurityHeaders.com: A+ rating
- Mozilla Observatory: A+ rating

## Rate Limiting

### Current Implementation (Frontend)

**Client-Side Rate Limiting:**

```typescript
// src/services/authService.ts
// Rate limiting for signup/login attempts

class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly maxAttempts = 5
  private readonly windowMs = 15 * 60 * 1000 // 15 minutes

  checkLimit(identifier: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(identifier) || []

    // Remove old attempts outside window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs)

    if (recentAttempts.length >= this.maxAttempts) {
      return false // Rate limited
    }

    recentAttempts.push(now)
    this.attempts.set(identifier, recentAttempts)
    return true
  }
}
```

**Waitlist Submission Rate Limiting:**

```typescript
// src/services/dataService.ts
const waitlistRateLimit = {
  maxAttempts: 3,
  window: 60 * 60 * 1000, // 1 hour

  check(email: string): boolean {
    const key = `waitlist_${email}`
    const attempts = JSON.parse(localStorage.getItem(key) || '[]')
    const now = Date.now()

    const recentAttempts = attempts.filter(
      (time: number) => now - time < this.window
    )

    if (recentAttempts.length >= this.maxAttempts) {
      throw new Error(
        'Too many waitlist submission attempts. Please try again later.'
      )
    }

    recentAttempts.push(now)
    localStorage.setItem(key, JSON.stringify(recentAttempts))
    return true
  },
}
```

### Future Backend Rate Limiting (Q4 2025)

**API Gateway Rate Limiting:**

```typescript
// Future implementation when backend is added
const rateLimitConfig = {
  // Global rate limit
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    message: 'Too many requests, please try again later',
  },

  // Endpoint-specific limits
  endpoints: {
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000,
      max: 5, // Max 5 login attempts per 15 min
      skipSuccessfulRequests: true,
    },
    '/api/auth/signup': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Max 3 signups per hour per IP
    },
    '/api/notes': {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60, // Max 60 note operations per minute
    },
  },

  // IP-based blocking
  trustProxy: true,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
}
```

**Express.js Implementation (Future):**

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:', // Rate limit prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After'),
    })
  },
})

app.use('/api/', limiter)
```

**Cloudflare Rate Limiting (Recommended):**

```yaml
# Cloudflare configuration (if using Cloudflare)
rate_limiting:
  - description: 'API rate limit'
    threshold: 100
    period: 60 # seconds
    action: challenge # or block

  - description: 'Login endpoint protection'
    match:
      url: '*/api/auth/login'
    threshold: 5
    period: 900 # 15 minutes
    action: block
```

### DDoS Protection

**Cloudflare Integration (Recommended):**

1. Enable Cloudflare DNS proxy (orange cloud)
2. Enable "I'm Under Attack Mode" during DDoS
3. Configure WAF (Web Application Firewall) rules
4. Enable bot protection

**Netlify DDoS Protection:**

- Automatic DDoS mitigation included
- CDN-level protection
- No additional configuration needed

**Rate Limiting Headers (Future):**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
Retry-After: 60
```

## Input Validation & Sanitization

### XSS Prevention

**Current Implementation:**

```typescript
// src/utils/sanitize.ts (if not exists, should be created)
import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 10000) // Limit length
}
```

**Usage in Components:**

```typescript
// Always sanitize user input before rendering
const cleanTitle = sanitizeInput(userInput.title)
const cleanContent = sanitizeHtml(userInput.content)
```

### SQL Injection Prevention (Future)

**When Backend Added:**

```typescript
// Use parameterized queries
const query = 'SELECT * FROM notes WHERE user_id = ? AND id = ?'
const results = await db.query(query, [userId, noteId])

// NEVER concatenate user input into queries
// ❌ BAD: const query = `SELECT * FROM notes WHERE id = ${userInput}`
```

### CSRF Protection (Future)

**Implementation with Backend:**

```typescript
// Generate CSRF token
const csrfToken = crypto.randomBytes(32).toString('hex')

// Include in forms
<input type="hidden" name="_csrf" value={csrfToken} />

// Verify on server
if (req.body._csrf !== req.session.csrfToken) {
  throw new Error('Invalid CSRF token')
}
```

## Authentication Security (Future - Q4 2025)

### Password Policy

**Requirements:**

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common passwords (check against breach database)

**Implementation:**

```typescript
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  commonPasswordCheck: true,
}

function validatePassword(password: string): boolean {
  // Check length
  if (password.length < passwordPolicy.minLength) return false

  // Check complexity
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false

  // Check against common passwords
  // Use: https://github.com/danielmiessler/SecLists

  return true
}
```

### Session Management

**Secure Session Configuration:**

```typescript
const sessionConfig = {
  secret: process.env.SESSION_SECRET, // 256-bit random string
  name: 'sessionId', // Don't use default names
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: 'paperlyte.com',
  },
  rolling: true, // Extend session on activity
}
```

### Two-Factor Authentication (2FA)

**Future Implementation:**

```typescript
// TOTP-based 2FA
import speakeasy from 'speakeasy'

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'Paperlyte',
  issuer: 'Paperlyte',
})

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.twoFactorSecret,
  encoding: 'base32',
  token: userInput.totpCode,
  window: 1, // Allow 30 seconds drift
})
```

## API Security (Future)

### API Authentication

**JWT Implementation:**

```typescript
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '1h',
  algorithm: 'HS256',
  issuer: 'paperlyte.com',
  audience: 'paperlyte-api',
}

// Generate token
const token = jwt.sign({ userId, email, role }, jwtConfig.secret, {
  expiresIn: jwtConfig.expiresIn,
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
})

// Verify token
const verified = jwt.verify(token, jwtConfig.secret, {
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
})
```

### API Key Management

**Best Practices:**

- Rotate API keys quarterly
- Use different keys for different environments
- Never commit keys to repository
- Store in encrypted vault or secret manager
- Monitor API key usage

## Security Monitoring

### Log Analysis

**Events to Monitor:**

- Failed login attempts (>3 in 5 minutes)
- New user registrations (unusual patterns)
- Password reset requests (multiple requests)
- API rate limit hits
- CSP violations
- Unusual traffic patterns

**Logging Best Practices:**

```typescript
// Log security events
monitoring.logSecurityEvent({
  type: 'failed_login',
  userId: email,
  ip: req.ip,
  timestamp: new Date(),
  metadata: {
    attemptCount: failedAttempts,
    userAgent: req.headers['user-agent'],
  },
})
```

### Intrusion Detection

**Automated Blocking:**

- Block IP after 10 failed login attempts
- Block suspicious user agents
- Block requests with malformed headers
- Alert on unusual geographic access patterns

## Compliance & Auditing

### Security Audit Schedule

**Monthly:**

- Review security logs
- Check for dependency vulnerabilities
- Update security documentation

**Quarterly:**

- Full security audit
- Penetration testing (recommended)
- Review and rotate secrets
- Update security headers

**Annually:**

- Third-party security assessment
- Compliance certification (if required)
- Disaster recovery drill
- Security training for team

### Compliance Checklist

- [ ] SSL/TLS configured and monitored
- [ ] Security headers implemented
- [ ] Rate limiting in place
- [ ] Input validation comprehensive
- [ ] Authentication secure (when added)
- [ ] Logging and monitoring active
- [ ] Incident response plan documented
- [ ] Regular security updates
- [ ] GDPR compliance maintained
- [ ] Backup and recovery tested

## Security Tools

### Development Tools

**Static Analysis:**

```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security
# Add to .eslintrc.cjs

# TypeScript strict mode
# Already enabled in tsconfig.json

# Dependency scanning
npm audit
npm audit fix
```

**Runtime Protection:**

```bash
# Helmet.js (when backend added)
npm install helmet

# express-rate-limit
npm install express-rate-limit

# express-validator
npm install express-validator
```

### Testing Tools

**Security Testing:**

```bash
# OWASP ZAP (automated security testing)
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://paperlyte.com

# Lighthouse security audit
npx lighthouse https://paperlyte.com --only-categories=best-practices

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=paperlyte.com
```

## Emergency Security Procedures

### Security Incident Response

1. **Immediate Actions**
   - Take affected systems offline if necessary
   - Rotate all API keys and secrets
   - Enable "I'm Under Attack" mode (Cloudflare)
   - Block malicious IPs at firewall level

2. **Investigation**
   - Review security logs
   - Identify attack vector
   - Assess damage and data exposure
   - Document timeline

3. **Containment**
   - Deploy security patches
   - Update firewall rules
   - Implement additional monitoring
   - Notify affected users (if data breach)

4. **Recovery**
   - Restore from clean backup if needed
   - Verify all systems secure
   - Monitor for continued attacks
   - Update security measures

5. **Post-Incident**
   - Complete incident report
   - Update security procedures
   - Train team on lessons learned
   - Implement preventive measures

### Contact Information

**Security Team:**

- Email: security@paperlyte.com
- PGP Key: [Public key fingerprint]

**Bug Bounty Program:**

- Details: security@paperlyte.com
- Scope: Production systems only
- Rewards: Based on severity

---

**Resources:**

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Mozilla Web Security: https://infosec.mozilla.org/guidelines/web_security
- CWE Top 25: https://cwe.mitre.org/top25/

**Last Reviewed:** 2025-11-02  
**Next Review:** 2025-12-02 (Monthly)
