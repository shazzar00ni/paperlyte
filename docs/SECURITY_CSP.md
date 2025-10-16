# Content Security Policy (CSP) Configuration

## Overview

This document details the Content Security Policy implementation for the Paperlyte application, providing comprehensive security against Cross-Site Scripting (XSS) and other injection attacks.

**CSP Version**: Level 3
**Implementation**: HTTP Headers + Meta Tags
**Environment**: Production & Development

## Current CSP Configuration

### Production CSP Header

```http
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://app.posthog.com https://*.sentry.io;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://app.posthog.com https://*.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

### Development CSP Configuration

Located in `vite.config.ts`:

```typescript
const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite HMR in development
    'https://app.posthog.com',
    'https://*.sentry.io',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
    'https://fonts.googleapis.com',
  ],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': [
    "'self'",
    'data:', // For base64 encoded images
    'https:', // Allow HTTPS images
  ],
  'connect-src': ["'self'", 'https://app.posthog.com', 'https://*.sentry.io'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
}
```

## CSP Directives Explained

### Core Directives

#### `default-src 'self'`

- **Purpose**: Default policy for all resource types
- **Value**: Only allow resources from same origin
- **Security**: Prevents loading of external resources unless explicitly allowed

#### `script-src 'self' 'unsafe-inline' [trusted-domains]`

- **Purpose**: Control JavaScript execution
- **Allowed Sources**:
  - `'self'`: Application scripts from same origin
  - `'unsafe-inline'`: Inline scripts (required for Vite HMR)
  - `https://app.posthog.com`: PostHog analytics
  - `https://*.sentry.io`: Sentry error monitoring
- **Security**: Prevents XSS attacks via script injection

#### `style-src 'self' 'unsafe-inline' [trusted-domains]`

- **Purpose**: Control CSS loading and styling
- **Allowed Sources**:
  - `'self'`: Application stylesheets
  - `'unsafe-inline'`: Inline styles (required for Tailwind CSS)
  - `https://fonts.googleapis.com`: Google Fonts CSS
- **Security**: Prevents CSS injection attacks

### Resource Control Directives

#### `font-src 'self' https://fonts.gstatic.com`

- **Purpose**: Control font loading sources
- **Security**: Prevents font-based data exfiltration

#### `img-src 'self' data: https:`

- **Purpose**: Control image loading sources
- **Allowed Sources**:
  - `'self'`: Application images
  - `data:`: Base64 encoded images
  - `https:`: Any HTTPS image source
- **Security**: Prevents malicious image loading

#### `connect-src 'self' [api-domains]`

- **Purpose**: Control AJAX, WebSocket, and fetch() requests
- **Allowed Sources**:
  - `'self'`: Same-origin API calls
  - `https://app.posthog.com`: Analytics API
  - `https://*.sentry.io`: Error reporting API
- **Security**: Prevents data exfiltration via network requests

### Security Directives

#### `frame-ancestors 'none'`

- **Purpose**: Prevent the page from being embedded in frames
- **Security**: Protects against clickjacking attacks
- **Equivalent**: `X-Frame-Options: DENY`

#### `base-uri 'self'`

- **Purpose**: Restrict the base URL for relative URLs
- **Security**: Prevents base tag injection attacks

#### `form-action 'self'`

- **Purpose**: Control form submission targets
- **Security**: Prevents form hijacking attacks

## CSP Implementation

### Vite Configuration

The CSP is implemented in `vite.config.ts` using custom headers:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': generateCSPHeader(cspConfig),
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': generateCSPHeader(cspConfig),
    },
  },
})

function generateCSPHeader(config: CSPConfig): string {
  return Object.entries(config)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}
```

### Production Deployment

For production deployment, CSP headers are set at the server level:

#### Netlify Configuration (`netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://app.posthog.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://app.posthog.com https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

#### Vercel Configuration (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://app.posthog.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://app.posthog.com https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        }
      ]
    }
  ]
}
```

## CSP Violation Reporting

### Report-URI Configuration

```typescript
const cspWithReporting = {
  ...cspConfig,
  'report-uri': ['/api/csp-violations'],
  'report-to': ['csp-endpoint'],
}
```

### Violation Handler

```typescript
// Future API endpoint for CSP violation reporting
app.post('/api/csp-violations', (req, res) => {
  const violation = req.body

  // Log violation for analysis
  console.warn('CSP Violation:', {
    documentURI: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    blockedURI: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
  })

  res.status(204).end()
})
```

## CSP Testing and Validation

### Browser Testing

Test CSP implementation across different browsers:

1. **Chrome DevTools**: Check Console for CSP violations
2. **Firefox**: Use Network tab to verify blocked resources
3. **Safari**: Check Web Inspector for security warnings

### Automated Testing

CSP validation is included in the test suite:

```javascript
// tests/security/csp.spec.js
describe('Content Security Policy', () => {
  test('should have CSP header in development', async () => {
    const response = await fetch('http://localhost:3000')
    expect(response.headers.get('content-security-policy')).toBeTruthy()
  })

  test('should block inline scripts without nonce', () => {
    // Test inline script blocking
  })
})
```

### CSP Analyzer Tools

Use these tools to validate CSP configuration:

1. **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
2. **Mozilla Observatory**: https://observatory.mozilla.org/
3. **Security Headers**: https://securityheaders.com/

## Common CSP Issues and Solutions

### Issue 1: Inline Scripts Blocked

**Problem**: Inline scripts are blocked by CSP
**Solution**:

- Use external script files
- Implement nonce-based CSP for necessary inline scripts
- Move initialization code to external files

### Issue 2: Third-party Resources Blocked

**Problem**: External resources (fonts, analytics) are blocked
**Solution**: Add trusted domains to appropriate directives

```typescript
'font-src': ["'self'", 'https://fonts.gstatic.com'],
'script-src': ["'self'", 'https://app.posthog.com']
```

### Issue 3: CSS-in-JS Libraries Issues

**Problem**: Dynamic styles are blocked
**Solution**:

- Use `'unsafe-inline'` for development
- Implement nonce-based CSP for production
- Consider server-side rendering for critical CSS

### Issue 4: Data URLs Blocked

**Problem**: Base64 images or fonts are blocked
**Solution**: Add `data:` to appropriate directives

```typescript
'img-src': ["'self'", 'data:'],
'font-src': ["'self'", 'data:']
```

## CSP Evolution and Maintenance

### Regular Reviews

1. **Monthly**: Review CSP violation reports
2. **Quarterly**: Update CSP based on new requirements
3. **Per Release**: Validate CSP with new features

### Future Enhancements

1. **Nonce-based CSP**: Implement nonce for inline scripts/styles
2. **Hash-based CSP**: Use SHA hashes for specific inline content
3. **Strict CSP**: Implement strict-dynamic for enhanced security
4. **Trusted Types**: Add trusted-types directive for DOM manipulation

### CSP Monitoring

Monitor CSP effectiveness through:

1. **Violation Reports**: Track blocked resources
2. **Security Metrics**: Monitor XSS attempt prevention
3. **Performance Impact**: Ensure CSP doesn't affect performance
4. **Compatibility**: Track browser support and issues

## Security Benefits

### XSS Prevention

CSP provides multiple layers of XSS protection:

1. **Script Injection**: Blocks unauthorized script execution
2. **Data Exfiltration**: Prevents unauthorized network requests
3. **UI Redressing**: Blocks iframe embedding attacks
4. **Form Hijacking**: Restricts form submission targets

### Defense in Depth

CSP works alongside other security measures:

1. **Input Validation**: Sanitize user inputs
2. **Output Encoding**: Encode dynamic content
3. **HTTPS Enforcement**: Secure data transmission
4. **Secure Cookies**: Protect session data

---

**Last Updated**: October 2024
**Next Review**: January 2025
**Owner**: Security Team
