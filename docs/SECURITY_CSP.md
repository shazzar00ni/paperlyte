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

**⚠️ SECURITY WARNING**: The development server with relaxed CSP should ONLY be run on trusted, isolated networks (localhost). Never expose the development server to untrusted networks or the internet. The development server is configured to bind to `localhost` only by default for security.

### Production CSP Recommendations

For production deployments, use HTTP headers with stricter policies:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

## Development Server Security

### Critical Security Practices

1. **Network Isolation**: Run the development server only on localhost (127.0.0.1)
2. **Never Expose Publicly**: Do not bind to 0.0.0.0 or expose to the internet
3. **Trusted Networks Only**: Only access from trusted development machines
4. **VPN/Firewall**: Use VPN or firewall rules if remote access is needed
5. **Development Data**: Never use production data in development environments

### Why Development CSP is Relaxed

The development server uses `'unsafe-eval'` and `'unsafe-inline'` because:
- Vite's Hot Module Replacement (HMR) requires dynamic script evaluation
- Development tooling needs inline styles for fast refresh
- WebSocket connections (ws:/wss:) enable live reload functionality

These relaxations are **acceptable in development** when the server is properly isolated but would be **critical vulnerabilities in production**.

## Security Benefits

1. **XSS Protection**: Prevents execution of malicious scripts
2. **Data Injection Prevention**: Controls resource loading sources
3. **Clickjacking Protection**: Prevents embedding in malicious frames
4. **HTTPS Enforcement**: Ensures secure connections
5. **Attack Surface Reduction**: Minimizes potential injection points

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
