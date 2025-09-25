# Security Deployment Guide

This document outlines the security configurations required for production deployment of Paperlyte.

## Content Security Policy (CSP)

### Development
The development server automatically sets CSP headers via Vite configuration. No additional setup required.

### Production Deployment

**Important**: CSP must be set via HTTP headers on your production server for proper security. CSP via meta tags is less secure and can be bypassed.

#### Recommended CSP Header
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;
```

#### Server Configuration Examples

**Nginx:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;";
```

**Apache (.htaccess):**
```apache
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;"
```

**Netlify (_headers file):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;
```

**Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;"
        }
      ]
    }
  ]
}
```

## Source Maps

Source maps are automatically disabled in production builds to prevent source code exposure. They are only enabled in development mode for debugging purposes.

### Build Configuration
- **Development**: `sourcemap: true` (enabled for debugging)
- **Production**: `sourcemap: false` (disabled for security)

## Additional Security Headers

Consider adding these additional security headers in production:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Security Checklist

- [ ] CSP headers configured at server level
- [ ] Source maps disabled in production builds
- [ ] Additional security headers configured
- [ ] HTTPS enabled with proper certificates
- [ ] Regular security audits with `npm audit`
- [ ] Dependencies kept up to date

## Testing CSP

Use browser developer tools to verify CSP is properly enforced:
1. Open browser dev tools
2. Check Console for CSP violations
3. Verify Network tab shows CSP headers in response
4. Use online CSP validators for additional verification

## Support

For security-related questions or issues, contact: security@paperlyte.com