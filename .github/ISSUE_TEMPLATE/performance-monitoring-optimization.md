---
title: '[OPTIMIZATION] Review and fine-tune Sentry performance monitoring configuration'
labels: ['optimization', 'monitoring', 'performance', 'low-priority']
assignees: ''
---

## Overview

The current Sentry configuration in `src/utils/monitoring.ts` needs review and optimization for production use to ensure we're capturing the right performance data without impacting user experience.

## Current Configuration Review

**File**: `src/utils/monitoring.ts`

### Current Settings

```typescript
// Performance monitoring
tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

// Session replay
replaysSessionSampleRate: 0.1,
replaysOnErrorSampleRate: 1.0,
```

## Areas for Optimization

### 1. Sampling Rates Analysis

- [ ] **Traces sample rate**: Currently 10% in production - evaluate if sufficient
- [ ] **Session replay rate**: 10% random + 100% on errors - assess data volume
- [ ] **Performance impact**: Monitor overhead on user devices
- [ ] **Cost vs benefit**: Balance monitoring costs with data quality

### 2. Performance Metrics Coverage

- [ ] **Web Vitals**: Ensure Core Web Vitals are properly tracked
- [ ] **React performance**: Component render times and re-renders
- [ ] **Network requests**: API call performance (future)
- [ ] **User interactions**: Click, scroll, navigation timing

### 3. Error Filtering Optimization

Current filtering logic:

```typescript
beforeSend(event, hint) {
  // Filter out known non-critical errors
  if (error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch')) {
    return null
  }
  return event
}
```

**Improvements needed:**

- [ ] More sophisticated error categorization
- [ ] User consent and privacy considerations
- [ ] Rate limiting for repeated errors
- [ ] Context enrichment for debugging

### 4. Development vs Production Tuning

- [ ] **Development mode**: More verbose logging and full sampling
- [ ] **Production mode**: Optimized for performance and cost
- [ ] **Staging environment**: Medium sampling for testing
- [ ] **Feature flags**: Dynamic configuration based on user segments

## Proposed Improvements

### Enhanced Configuration

```typescript
const getSentryConfig = () => {
  const environment = import.meta.env.MODE

  const baseConfig = {
    dsn: SENTRY_DSN,
    environment,
    release: APP_VERSION,

    // Performance monitoring - environment specific
    tracesSampleRate:
      {
        development: 1.0,
        staging: 0.3,
        production: 0.1,
      }[environment] || 0.1,

    // Session replay - more conservative
    replaysSessionSampleRate: environment === 'production' ? 0.05 : 0.2,
    replaysOnErrorSampleRate: 1.0,

    // Enhanced error filtering
    beforeSend: enhancedErrorFilter,

    // Performance optimizations
    maxBreadcrumbs: 50,
    attachStacktrace: true,

    // Privacy controls
    sendDefaultPii: false,
  }

  return baseConfig
}
```

### Advanced Error Filtering

```typescript
const enhancedErrorFilter = (event: ErrorEvent, hint: EventHint) => {
  const error = hint.originalException

  // Skip common browser/network errors
  if (isNetworkError(error) || isBrowserExtensionError(error)) {
    return null
  }

  // Rate limit repeated errors
  if (shouldRateLimit(error)) {
    return null
  }

  // Enrich context for debugging
  event.extra = {
    ...event.extra,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    connection: (navigator as any).connection?.effectiveType,
  }

  return event
}
```

## Performance Monitoring Enhancements

### 1. Custom Performance Metrics

```typescript
// Track app-specific performance
export const trackCustomMetric = (
  name: string,
  value: number,
  unit?: string
) => {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name}: ${value}${unit || 'ms'}`,
    level: 'info',
  })
}

// Usage examples
trackCustomMetric('note_save_time', saveTimeMs)
trackCustomMetric('search_results_time', searchTimeMs)
```

### 2. User Journey Tracking

```typescript
// Track critical user flows
export const trackUserJourney = (step: string, metadata?: object) => {
  Sentry.addBreadcrumb({
    category: 'user_journey',
    message: step,
    data: metadata,
    level: 'info',
  })
}
```

## Implementation Plan

### Phase 1: Analysis & Monitoring

- [ ] Review current Sentry dashboard and identify gaps
- [ ] Analyze performance impact of current configuration
- [ ] Assess data volume and costs

### Phase 2: Configuration Optimization

- [ ] Implement environment-specific configurations
- [ ] Enhance error filtering logic
- [ ] Add custom performance tracking

### Phase 3: Advanced Features

- [ ] User consent management for monitoring
- [ ] Dynamic sampling based on user segments
- [ ] Integration with analytics for correlation

### Phase 4: Documentation & Training

- [ ] Document monitoring best practices
- [ ] Create alerting and incident response procedures
- [ ] Train team on Sentry dashboard usage

## Success Metrics

- [ ] **Performance impact**: <1% overhead on page load time
- [ ] **Error detection**: 95% of critical errors captured
- [ ] **Signal to noise ratio**: <5% false positive error reports
- [ ] **Data quality**: Actionable insights from performance data
- [ ] **Cost efficiency**: Monitoring costs <2% of infrastructure budget

## Privacy & Compliance Considerations

- [ ] **GDPR compliance**: User consent for performance monitoring
- [ ] **Data retention**: Configure appropriate retention periods
- [ ] **PII protection**: Ensure no personal data in error reports
- [ ] **User control**: Allow users to opt-out of monitoring

## Priority

**Low-Medium** - Important for production reliability but not blocking current development.

## Additional Context

Good performance monitoring is crucial for:

- Identifying performance bottlenecks early
- Understanding user experience issues
- Debugging production problems efficiently
- Making data-driven optimization decisions

The current setup is functional but can be optimized for better signal-to-noise ratio and cost efficiency.
