# Analytics & Monitoring Setup

Paperlyte uses PostHog for analytics and Sentry for error monitoring to track feature usage, performance metrics, and crash reports.

## PostHog Analytics

### Features Tracked

- **User Actions**: Page views, feature usage, button clicks
- **Note Editor**: Create, edit, save, delete operations
- **Waitlist**: Signup events and conversion tracking
- **Performance**: Load times, render times, memory usage
- **Feature Usage**: Which features are used most frequently

### Events Structure

```typescript
// User actions
analytics.track('user_action', { action: 'landing_page_view' })

// Feature usage
analytics.trackFeature('note_editor', 'create', { noteId: 'uuid' })

// Performance metrics
analytics.trackPerformance('page_load_time', 1200, { unit: 'millisecond' })
```

### Setup

1. Sign up for PostHog at https://posthog.com
2. Get your API key and host URL
3. Add to environment variables:
   ```bash
   VITE_POSTHOG_API_KEY=your_api_key_here
   VITE_POSTHOG_HOST=https://app.posthog.com
   ```

## Sentry Error Monitoring

### Features Monitored

- **JavaScript Errors**: Runtime exceptions and crashes
- **Performance Issues**: Slow operations and memory leaks
- **User Context**: Error attribution to specific users/features
- **Breadcrumbs**: User action trails leading to errors
- **Release Tracking**: Error trends across app versions

### Error Context

```typescript
monitoring.logError(error, {
  userId: 'user123',
  feature: 'note_editor',
  action: 'save_note',
  additionalData: { noteId: 'uuid' },
})
```

### Setup

1. Create Sentry project at https://sentry.io
2. Get your DSN (Data Source Name)
3. Add to environment variables:
   ```bash
   VITE_SENTRY_DSN=your_sentry_dsn_here
   VITE_SENTRY_DEV_ENABLED=false
   ```

## Environment Configuration

### Production

```bash
# Analytics enabled
VITE_POSTHOG_API_KEY=ph_your_production_key
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_SENTRY_DSN=https://your_dsn@sentry.io/project_id
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Development

```bash
# Analytics disabled for development
VITE_POSTHOG_API_KEY=
VITE_SENTRY_DSN=
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## Privacy & Compliance

### Data Collection

- **Minimal Data**: Only essential usage metrics and error data
- **No PII**: Personal content is never sent to analytics services
- **User Consent**: Users can opt-out of analytics in preferences
- **GDPR Compliant**: Respects Do Not Track headers and user preferences

### User Controls

```typescript
// Disable analytics
analytics.disable()

// Enable analytics (with user consent)
analytics.enable()

// Reset user data (on logout)
analytics.reset()
```

## Admin Dashboard

The analytics data is displayed in the admin dashboard at `/admin`:

- **User Metrics**: Total users, active users, retention
- **Feature Usage**: Most used features, user journeys
- **Performance**: Load times, error rates, memory usage
- **Error Reports**: Recent errors, crash reports, resolution status

## Integration with Deployment

### Netlify

```toml
# netlify.toml
[build.environment]
  VITE_POSTHOG_API_KEY = "your_key"
  VITE_SENTRY_DSN = "your_dsn"
```

### Vercel

```json
// vercel.json
{
  "env": {
    "VITE_POSTHOG_API_KEY": "your_key",
    "VITE_SENTRY_DSN": "your_dsn"
  }
}
```

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
env:
  VITE_POSTHOG_API_KEY: ${{ secrets.POSTHOG_API_KEY }}
  VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

## Monitoring Best Practices

1. **Error Boundaries**: Wrap components in error boundaries
2. **Performance Tracking**: Monitor Core Web Vitals
3. **User Journey Tracking**: Track complete user flows
4. **A/B Testing**: Use PostHog feature flags for experiments
5. **Alert Configuration**: Set up alerts for critical errors
6. **Regular Reviews**: Weekly analysis of metrics and errors

## Development Usage

```typescript
import { analytics, monitoring } from './utils'

// Track feature usage
const handleFeatureUse = () => {
  analytics.trackFeature('feature_name', 'action')
}

// Handle errors gracefully
const handleError = (error: Error) => {
  monitoring.logError(error, {
    feature: 'component_name',
    action: 'user_action',
  })
}

// Add debugging context
monitoring.addBreadcrumb('User clicked button', 'ui', {
  buttonId: 'save-note',
})
```

---

For questions about analytics setup, email analytics@paperlyte.com
