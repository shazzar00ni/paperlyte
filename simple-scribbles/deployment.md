# Paperlyte Deployment Guide

## Netlify (Recommended)

1. Connect your GitHub repository.
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy and enable branch deploys.

## Vercel

```bash
npm install -g vercel
vercel --prod
```

## Traditional Hosting

```bash
npm run build
# Upload dist/ to your web server
```

## Environment Variables

### Core App Variables

- `VITE_API_BASE_URL` (for API integration)
- `VITE_APP_VERSION` (app version for releases)

### Analytics & Monitoring

- `VITE_POSTHOG_API_KEY` (PostHog analytics)
- `VITE_POSTHOG_HOST` (PostHog host URL)
- `VITE_SENTRY_DSN` (Sentry error monitoring)
- `VITE_SENTRY_DEV_ENABLED` (enable Sentry in development)

### Feature Flags

- `VITE_ENABLE_ANALYTICS` (enable/disable analytics)
- `VITE_ENABLE_ERROR_REPORTING` (enable/disable error reporting)
- `VITE_ENABLE_PERFORMANCE_MONITORING` (enable/disable performance monitoring)

### Database (Future)

- `VITE_SUPABASE_URL` (if using Supabase)
- `VITE_SUPABASE_ANON_KEY` (if using Supabase)

---
