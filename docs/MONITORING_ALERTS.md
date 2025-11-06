# Production Monitoring & Alerting Configuration

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** DevOps Team

## Overview

This document defines monitoring dashboards, alert thresholds, and escalation procedures for Paperlyte production environments. It ensures proactive detection of issues before they impact users.

## Monitoring Stack

### Current Implementation

- **Error Monitoring:** Sentry (JavaScript errors, performance issues)
- **Analytics & User Behavior:** PostHog (usage metrics, funnels, session recordings)
- **Performance Monitoring:** Lighthouse CI (Core Web Vitals)
- **Build & Deploy:** GitHub Actions, Netlify/Vercel dashboards
- **Uptime Monitoring:** Browser/third-party service (future: UptimeRobot, Pingdom)

## Sentry Configuration

### Error Monitoring Setup

**Environment Variables:**

```bash
# Production
VITE_SENTRY_DSN=https://[key]@o[org].ingest.sentry.io/[project]
VITE_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# Staging
VITE_SENTRY_DSN=https://[key]@o[org].ingest.sentry.io/[project-staging]
VITE_ENVIRONMENT=staging
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
```

### Alert Rules

#### Critical Alerts (Immediate - SEV-1)

**1. High Error Rate**

- **Condition:** Error rate > 5% over 5 minutes
- **Action:** Page on-call engineer
- **Notification:** Slack + Email + PagerDuty
- **Dashboard:** https://sentry.io/[org]/[project]/alerts/

**Configuration:**

```yaml
alert: high_error_rate
condition: error_rate > 5%
window: 5 minutes
severity: critical
notify:
  - slack: #alerts-critical
  - email: oncall@paperlyte.com
  - pagerduty: engineering
```

**2. Service Completely Down (All Requests Failing)**

- **Condition:** 0 successful requests in 5 minutes
- **Action:** Immediate escalation to all engineers
- **Notification:** Slack + Email + SMS

**Configuration:**

```yaml
alert: service_down
condition: successful_requests = 0
window: 5 minutes
severity: critical
notify:
  - slack: @channel in #alerts-critical
  - email: all-engineers@paperlyte.com
  - sms: on-call-primary
```

#### High Priority Alerts (< 30 min - SEV-2)

**3. Elevated Error Rate**

- **Condition:** Error rate > 1% over 15 minutes
- **Action:** Create incident ticket, notify team lead
- **Notification:** Slack + Email

**Configuration:**

```yaml
alert: elevated_error_rate
condition: error_rate > 1%
window: 15 minutes
severity: high
notify:
  - slack: #alerts
  - email: devops@paperlyte.com
```

**4. Performance Degradation**

- **Condition:** P95 response time > 3 seconds over 10 minutes
- **Action:** Investigate and optimize
- **Notification:** Slack

**Configuration:**

```yaml
alert: slow_performance
condition: p95_response_time > 3000ms
window: 10 minutes
severity: high
notify:
  - slack: #alerts
```

**5. New Error Type Introduced**

- **Condition:** New error fingerprint after deployment
- **Action:** Review and triage
- **Notification:** Slack (deployment channel)

**Configuration:**

```yaml
alert: new_error_type
condition: new_error_fingerprint = true
after_deployment: true
severity: medium
notify:
  - slack: #deployments
```

#### Medium Priority Alerts (< 2 hours - SEV-3)

**6. Increased Error Volume**

- **Condition:** 50% increase in error volume over 1 hour
- **Action:** Monitor and investigate if continues
- **Notification:** Slack

**Configuration:**

```yaml
alert: error_volume_spike
condition: error_volume_increase > 50%
window: 1 hour
severity: medium
notify:
  - slack: #monitoring
```

**7. Memory Leak Detection**

- **Condition:** Consistent memory growth without GC
- **Action:** Schedule investigation
- **Notification:** Email

**Configuration:**

```yaml
alert: potential_memory_leak
condition: memory_growth_rate > threshold
window: 30 minutes
severity: medium
notify:
  - email: devops@paperlyte.com
```

### Sentry Dashboard Widgets

**Primary Dashboard Metrics:**

1. **Error Rate Trend** (last 24 hours)
2. **Top 10 Errors by Volume**
3. **Errors by Browser/Device**
4. **Errors by Release Version**
5. **User Impact** (unique users affected)
6. **Performance Metrics** (transaction duration)

**Example Dashboard Configuration:**

```json
{
  "dashboard": "production-overview",
  "widgets": [
    {
      "title": "Error Rate",
      "type": "line-chart",
      "metric": "error_rate",
      "interval": "1h",
      "time_range": "24h"
    },
    {
      "title": "Errors by Browser",
      "type": "pie-chart",
      "dimension": "browser.name",
      "time_range": "24h"
    },
    {
      "title": "Most Impactful Errors",
      "type": "table",
      "sort": "user_count",
      "limit": 10
    }
  ]
}
```

## PostHog Configuration

### Analytics Monitoring Setup

**Environment Variables:**

```bash
# Production
VITE_POSTHOG_API_KEY=phc_[production-key]
VITE_POSTHOG_HOST=https://app.posthog.com

# Staging
VITE_POSTHOG_API_KEY=phc_[staging-key]
VITE_POSTHOG_HOST=https://app.posthog.com
```

### Key Metrics & Dashboards

#### User Engagement Dashboard

**1. Daily Active Users (DAU)**

- **Target:** > 100 users/day (production)
- **Alert:** DAU drops > 30% day-over-day
- **Action:** Investigate user experience issues

**2. Session Duration**

- **Target:** Average > 2 minutes
- **Alert:** Drops below 1 minute average
- **Action:** Check for UX issues or bugs

**3. Note Creation Rate**

- **Target:** > 50 notes/day
- **Alert:** Drops > 40% from baseline
- **Action:** Review editor functionality

**4. Bounce Rate**

- **Target:** < 60%
- **Alert:** Exceeds 75%
- **Action:** Review landing page, check load times

#### Conversion Funnel Monitoring

**Waitlist Signup Funnel:**

```
Landing Page View
  ↓ (Target: 10% conversion)
Waitlist Modal Opened
  ↓ (Target: 40% conversion)
Email Entered
  ↓ (Target: 80% completion)
Waitlist Signup Complete
```

**Alert Thresholds:**

- Modal open rate < 8%: Check CTA visibility
- Email entry rate < 30%: Review form UX
- Completion rate < 70%: Check for submission errors

#### Technical Performance Metrics

**1. Page Load Time**

- **Target:** < 2 seconds (P75)
- **Alert:** P75 > 3 seconds
- **Action:** Optimize bundle size, review lazy loading

**2. Time to Interactive (TTI)**

- **Target:** < 3 seconds
- **Alert:** TTI > 5 seconds
- **Action:** Reduce JavaScript execution time

**3. Cumulative Layout Shift (CLS)**

- **Target:** < 0.1
- **Alert:** CLS > 0.25
- **Action:** Fix layout shift issues

### PostHog Alert Configuration

**Example Insight Alerts:**

```javascript
// Create alert in PostHog UI
{
  "name": "DAU Drop",
  "insight": "daily_active_users",
  "condition": {
    "type": "decrease",
    "threshold": "30%",
    "comparison": "previous_period"
  },
  "notify": [
    { "type": "slack", "channel": "#product-alerts" },
    { "type": "email", "recipients": ["product@paperlyte.com"] }
  ],
  "frequency": "hourly"
}
```

## Lighthouse CI Configuration

### Performance Budget Enforcement

**Core Web Vitals Targets:**

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],

        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],

        "speed-index": ["error", { "maxNumericValue": 3000 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],

        "resource-summary:script:size": [
          "error",
          { "maxNumericValue": 400000 }
        ],
        "resource-summary:image:size": ["error", { "maxNumericValue": 200000 }],
        "resource-summary:stylesheet:size": [
          "error",
          { "maxNumericValue": 100000 }
        ]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Performance Regression Alerts

**GitHub Actions Integration:**

```yaml
# .github/workflows/performance.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    configPath: './.lighthouserc.strict.json'
    uploadArtifacts: true
    temporaryPublicStorage: true

- name: Check for Performance Regressions
  run: |
    # Alert if performance score drops > 5 points
    if [ $PERF_REGRESSION -gt 5 ]; then
      echo "⚠️ Performance regression detected!"
      # Post to Slack
      curl -X POST $SLACK_WEBHOOK -d '{"text":"Performance regression in PR"}'
    fi
```

## GitHub Actions Monitoring

### Build & Deployment Alerts

**1. Build Failures**

- **Condition:** Any CI job fails on main branch
- **Action:** Block deployment, notify team
- **Notification:** Slack + Email

**2. Deployment Failures**

- **Condition:** Netlify/Vercel deployment fails
- **Action:** Immediate investigation
- **Notification:** Slack + Page on-call

**3. Security Vulnerabilities**

- **Condition:** CodeQL finds high/critical issues
- **Action:** Create security issue, notify security team
- **Notification:** GitHub Security tab + Email

**4. Test Failures**

- **Condition:** Test suite failure rate > 5%
- **Action:** Block PR merge
- **Notification:** PR comment + Slack

### Workflow Status Dashboard

**Key Metrics:**

- Build success rate (target: > 95%)
- Average build time (target: < 5 minutes)
- Deployment frequency (target: multiple per day)
- Mean time to recovery (target: < 1 hour)

## Custom Health Check Endpoint

### Implementation (Future Enhancement)

**Create health check endpoint:**

```typescript
// src/api/health.ts (Q4 2025 when backend is added)
export async function healthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    checks: {
      storage: await checkStorageHealth(),
      analytics: await checkAnalyticsHealth(),
      monitoring: await checkMonitoringHealth(),
    },
  }
}

async function checkStorageHealth() {
  try {
    // Test localStorage access
    const testKey = 'health_check_test'
    localStorage.setItem(testKey, 'ok')
    localStorage.removeItem(testKey)
    return { status: 'ok', message: 'Storage accessible' }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
}
```

**Monitor endpoint:**

```bash
# External monitoring (UptimeRobot, Pingdom, etc.)
curl https://paperlyte.com/api/health
# Expected response: { "status": "healthy", ... }
```

## Uptime Monitoring (Recommended Setup)

### External Monitoring Services

**UptimeRobot Configuration:**

```yaml
monitors:
  - name: 'Paperlyte Production'
    url: 'https://paperlyte.com'
    type: 'http'
    interval: 300 # 5 minutes
    timeout: 30
    alert_contacts:
      - email: uptime@paperlyte.com
      - slack: #alerts-uptime

  - name: 'Paperlyte Staging'
    url: 'https://staging.paperlyte.com'
    type: 'http'
    interval: 600 # 10 minutes
    timeout: 30
    alert_contacts:
      - slack: #staging-alerts
```

**Response Time Targets:**

- **Production:** < 500ms average, < 2s P95
- **Staging:** < 1s average, < 3s P95

**Uptime SLA:**

- **Target:** 99.9% uptime (< 43 minutes downtime/month)
- **Alert:** If uptime drops below 99.5% in any 7-day period

## Alert Escalation Matrix

### Escalation Path

```
Level 1: On-Call Engineer (0-15 minutes)
    ↓ (if unresolved)
Level 2: Team Lead (15-30 minutes)
    ↓ (if unresolved)
Level 3: Engineering Manager (30-60 minutes)
    ↓ (if unresolved)
Level 4: CTO/VP Engineering (60+ minutes)
```

### Alert Routing

| Alert Type              | Severity | Primary       | Secondary     | Escalation |
| ----------------------- | -------- | ------------- | ------------- | ---------- |
| Service Down            | SEV-1    | All Engineers | Team Lead     | Immediate  |
| High Error Rate         | SEV-1    | On-Call       | Team Lead     | 15 min     |
| Performance Degradation | SEV-2    | On-Call       | DevOps        | 30 min     |
| Deployment Failure      | SEV-2    | DevOps        | On-Call       | 30 min     |
| Security Alert          | SEV-1/2  | Security Team | All Engineers | Immediate  |
| Data Loss               | SEV-1    | All Engineers | CTO           | Immediate  |

## Notification Channels

### Slack Integrations

**Critical Alerts Channel (#alerts-critical):**

- Service down notifications
- Data loss alerts
- Security breaches
- P1 incidents

**General Alerts Channel (#alerts):**

- Performance issues
- Elevated error rates
- Deployment notifications
- CI/CD failures

**Monitoring Channel (#monitoring):**

- Routine metrics
- Trend reports
- Capacity warnings
- Non-urgent updates

### Slack Webhook Configuration

```bash
# Production Alerts
SLACK_CRITICAL_WEBHOOK=https://hooks.slack.com/services/[critical-webhook]

# General Alerts
SLACK_ALERTS_WEBHOOK=https://hooks.slack.com/services/[alerts-webhook]

# Monitoring Updates
SLACK_MONITORING_WEBHOOK=https://hooks.slack.com/services/[monitoring-webhook]
```

**Example Alert Message:**

```json
{
  "text": "🚨 Production Alert: High Error Rate",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 SEV-2: High Error Rate Detected"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\nProduction"
        },
        {
          "type": "mrkdwn",
          "text": "*Error Rate:*\n2.5%"
        },
        {
          "type": "mrkdwn",
          "text": "*Threshold:*\n1.0%"
        },
        {
          "type": "mrkdwn",
          "text": "*Duration:*\n15 minutes"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Actions:*\n• <https://sentry.io|View Errors in Sentry>\n• <https://posthog.com|Check User Impact>\n• <runbook-link|Incident Response Runbook>"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Acknowledge"
          },
          "style": "primary",
          "url": "https://incident-response-url"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Escalate"
          },
          "style": "danger",
          "url": "https://escalation-url"
        }
      ]
    }
  ]
}
```

## Monitoring Best Practices

### 1. Alert Fatigue Prevention

- **Tune thresholds** to reduce false positives
- **Consolidate alerts** - group related issues
- **Set quiet hours** for non-critical alerts
- **Review and adjust** thresholds monthly

### 2. Context in Alerts

- Include relevant metrics in alert message
- Link to runbooks and dashboards
- Provide suggested actions
- Show historical context

### 3. Regular Review

- **Weekly:** Review alert volume and response times
- **Monthly:** Adjust thresholds based on trends
- **Quarterly:** Full monitoring stack review
- **Post-Incident:** Update alerts based on learnings

### 4. Documentation

- Keep runbooks up to date
- Document all alert configurations
- Maintain escalation contact list
- Record alert tuning decisions

## Dashboard Links Quick Reference

### Production Monitoring

- **Sentry Dashboard:** https://sentry.io/organizations/paperlyte/dashboard/
- **PostHog Analytics:** https://app.posthog.com/project/[project-id]
- **Netlify Analytics:** https://app.netlify.com/sites/paperlyte-prod/analytics
- **GitHub Actions:** https://github.com/shazzar00ni/paperlyte/actions

### Development/Staging

- **Staging Sentry:** https://sentry.io/organizations/paperlyte/projects/paperlyte-staging/
- **Staging PostHog:** https://app.posthog.com/project/[staging-project-id]
- **Staging Netlify:** https://app.netlify.com/sites/paperlyte-staging/

### Security & Compliance

- **CodeQL Results:** https://github.com/shazzar00ni/paperlyte/security/code-scanning
- **Dependency Alerts:** https://github.com/shazzar00ni/paperlyte/security/dependabot
- **Audit Logs:** https://github.com/shazzar00ni/paperlyte/settings/audit-log

---

**Next Actions:**

1. Configure alert rules in Sentry and PostHog
2. Set up Slack webhook integrations
3. Create production monitoring dashboards
4. Test alert escalation procedures
5. Document on-call rotation schedule

**Last Reviewed:** 2025-11-02  
**Next Review:** 2025-12-02 (Monthly)
