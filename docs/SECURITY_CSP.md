# Content Security Policy (CSP) Configuration

## Overview

This document outlines the Content Security Policy configuration for Paperlyte, including development and production recommendations.

## Current Implementation

### Development CSP (vite.config.ts)

The development server uses relaxed CSP directives to support Vite's Hot Module Replacement (HMR):

```typescript
// Development-only CSP (includes unsafe directives for HMR)
"default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:;"
```

**Note**: `'unsafe-eval'` and `'unsafe-inline'` are included only in development mode for Vite HMR functionality.

### Production CSP Recommendations

For production deployments, use HTTP headers with stricter policies:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

## Security Benefits

1. **XSS Protection**: Prevents execution of malicious scripts
2. **Data Injection Prevention**: Controls resource loading sources
3. **Clickjacking Protection**: Prevents embedding in malicious frames
4. **HTTPS Enforcement**: Ensures secure connections

## Implementation Steps for Production

1. **Server Configuration**: Set CSP headers at the server level (nginx, Apache, CDN)
2. **Nonce Generation**: Generate random nonces for inline scripts/styles
3. **Hash-based CSP**: Alternative to nonces using SHA-256 hashes
4. **Testing**: Validate CSP doesn't break functionality
5. **Reporting**: Configure CSP reporting for violations

## Example Production Configurations

### Netlify (\_headers file)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### Vercel (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        }
      ]
    }
  ]
}
```

## Monitoring and Maintenance

1. **CSP Reports**: Monitor violation reports to identify issues
2. **Regular Updates**: Update CSP as application evolves
3. **Security Audits**: Include CSP in regular security reviews
4. **Browser Compatibility**: Test CSP across supported browsers

## Related Security Headers

Consider implementing additional security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Resources

- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
