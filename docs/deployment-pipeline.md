# Deployment Pipeline Documentation

## Overview

Paperlyte's deployment pipeline provides enterprise-grade deployment capabilities including blue-green deployments, automated rollbacks, health checks, and database migration automation.

## Table of Contents

- [Deployment Strategies](#deployment-strategies)
- [Blue-Green Deployment](#blue-green-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Health Checks](#health-checks)
- [Database Migrations](#database-migrations)
- [Environment Management](#environment-management)

## Deployment Strategies

### Standard Deployment

**Workflow:** `.github/workflows/deploy.yml`

**Triggers:**

- Push to `main` branch → Staging deployment
- GitHub Release → Production deployment

**Features:**

- Automated build and deployment
- Environment-specific configuration
- Deployment status reporting

### Blue-Green Deployment

**Workflow:** `.github/workflows/deploy-blue-green.yml`

**Purpose:** Zero-downtime deployments with easy rollback capability

**How It Works:**

1. Deploy new version to "blue" environment
2. Run comprehensive health checks
3. Switch traffic to blue environment (manual or automatic)
4. Keep previous "green" environment for instant rollback

**Usage:**

```bash
# Via GitHub UI
1. Go to Actions → Blue-Green Deployment
2. Click "Run workflow"
3. Select environment (staging/production)
4. Choose deployment type
5. Enable/disable auto-switch
```

**Manual Workflow Dispatch:**

```yaml
environment: production
deployment_type: blue-green
auto_switch: false # Requires manual approval
```

## Rollback Procedures

### Automated Rollback

**Workflow:** `.github/workflows/rollback.yml`

**When to Use:**

- Critical bugs in production
- Performance degradation
- Security issues
- Failed deployments

**How to Rollback:**

```bash
# Via GitHub UI
1. Go to Actions → Rollback Deployment
2. Click "Run workflow"
3. Select environment
4. Choose rollback target:
   - "previous" (automatic)
   - Specific commit SHA
5. Provide rollback reason
6. Confirm rollback
```

**Rollback Process:**

1. Validates rollback target
2. Checks out previous code
3. Runs tests (best effort)
4. Builds application
5. Deploys to environment
6. Verifies deployment health
7. Creates incident log

**Rollback Targets:**

```yaml
# Roll back to previous deployment
rollback_target: "previous"

# Roll back to specific commit
rollback_target: "abc123def456"
```

### Manual Rollback

If automated rollback fails:

```bash
# 1. Find previous working commit
git log --oneline

# 2. Checkout that commit
git checkout <commit-sha>

# 3. Deploy manually
npm run build
netlify deploy --prod --dir=dist
```

## Health Checks

### Automated Health Checks

**Workflow:** `.github/workflows/post-deploy-health-check.yml`

**Triggers:**

- After every deployment
- Manual workflow dispatch
- Scheduled checks (optional)

**Health Check Types:**

1. **HTTP Status Check**
   - Verifies 200 OK response
   - Tests main application URL

2. **Response Time Check**
   - Measures page load time
   - Warning: >3s
   - Failure: >10s

3. **Critical Assets Check**
   - index.html
   - favicon.ico
   - JavaScript bundles

4. **Content Integrity Check**
   - Root element presence
   - App title verification
   - Bundle references

5. **SSL Certificate Check**
   - Certificate validity
   - Expiration date

### Health Endpoint

The application exposes a health endpoint for monitoring:

```javascript
// Access health status in browser console
const health = window.__paperlyte_health()

console.log(health)
// {
//   status: 'healthy',
//   version: '0.1.0',
//   timestamp: '2025-10-31T...',
//   checks: {
//     storage: true,
//     analytics: true,
//     monitoring: true
//   },
//   environment: 'production',
//   buildInfo: { ... }
// }
```

**Health Status Levels:**

- `healthy` - All systems operational
- `degraded` - Non-critical issues (analytics/monitoring offline)
- `unhealthy` - Critical issues (storage unavailable)

## Database Migrations

### Migration System

**Location:** `src/migrations/`

**Purpose:** Manage data schema changes for future API migration (Q4 2025)

### Creating Migrations

```typescript
// src/migrations/002-add-tags.ts
import type { Migration } from './migrationManager'

export const migration002AddTags: Migration = {
  version: 2,
  name: 'add-tags',
  description: 'Add tags support to notes',

  async up() {
    // Forward migration
    const notes = JSON.parse(localStorage.getItem('paperlyte_notes') || '[]')

    notes.forEach((note: any) => {
      if (!note.tags) {
        note.tags = []
      }
    })

    localStorage.setItem('paperlyte_notes', JSON.stringify(notes))
  },

  async down() {
    // Rollback migration
    const notes = JSON.parse(localStorage.getItem('paperlyte_notes') || '[]')

    notes.forEach((note: any) => {
      delete note.tags
    })

    localStorage.setItem('paperlyte_notes', JSON.stringify(notes))
  },
}
```

### Registering Migrations

```typescript
// src/migrations/index.ts
import { migrationManager } from './migrationManager'
import { migration001InitialSchema } from './001-initial-schema'
import { migration002AddTags } from './002-add-tags'

migrationManager.registerMigration(migration001InitialSchema)
migrationManager.registerMigration(migration002AddTags)
```

### Running Migrations

Migrations run automatically on application startup:

```typescript
// In App.tsx
useEffect(() => {
  if (migrationManager.needsMigration()) {
    await migrationManager.migrate()
  }
}, [])
```

### Migration Commands

```typescript
// Check migration status
const status = migrationManager.getStatus()
console.log(`Current version: ${status.currentVersion}`)
console.log(`Pending migrations: ${status.pendingMigrations.length}`)

// Run pending migrations
await migrationManager.migrate()

// Rollback specific migration
await migrationManager.rollback(2)
```

## Environment Management

### Environment Variables

**Staging:**

```bash
VITE_ENVIRONMENT=staging
VITE_POSTHOG_API_KEY=${{ secrets.VITE_POSTHOG_API_KEY_STAGING }}
VITE_SENTRY_DSN=${{ secrets.VITE_SENTRY_DSN_STAGING }}
```

**Production:**

```bash
VITE_ENVIRONMENT=production
VITE_POSTHOG_API_KEY=${{ secrets.VITE_POSTHOG_API_KEY_PROD }}
VITE_SENTRY_DSN=${{ secrets.VITE_SENTRY_DSN_PROD }}
```

### Environment Promotion

```bash
# Staging → Production promotion
1. Test thoroughly in staging
2. Create GitHub release
3. Tag follows semantic versioning (v1.2.3)
4. Production deployment triggers automatically
```

## Monitoring and Alerting

### Post-Deployment Monitoring

After deployment, monitor:

1. **Error Rates** (Sentry)
   - Check for new errors
   - Monitor error frequency
   - Review stack traces

2. **Performance** (PostHog)
   - Page load times
   - User interactions
   - Feature usage

3. **Health Status**
   - Run manual health checks
   - Verify critical paths
   - Test user workflows

### Alerting

Set up alerts for:

- Deployment failures
- Health check failures
- Error rate spikes
- Performance degradation

## Best Practices

### Pre-Deployment

1. ✅ Run full CI pipeline locally
2. ✅ Test in staging environment
3. ✅ Review code changes
4. ✅ Check for breaking changes
5. ✅ Verify environment variables

### During Deployment

1. ✅ Monitor deployment logs
2. ✅ Watch health checks
3. ✅ Be ready to rollback
4. ✅ Communicate with team

### Post-Deployment

1. ✅ Verify critical features
2. ✅ Monitor error rates
3. ✅ Check performance metrics
4. ✅ Review user feedback
5. ✅ Document any issues

## Troubleshooting

### Deployment Fails

```bash
# Check workflow logs
1. Go to Actions tab
2. Select failed workflow
3. Review logs for errors
4. Fix issues and re-run
```

### Health Checks Fail

```bash
# Manual verification
1. Open deployment URL
2. Check browser console
3. Test critical features
4. Review health status
```

### Rollback Needed

```bash
# Quick rollback
1. Go to Actions → Rollback Deployment
2. Select environment
3. Choose "previous"
4. Add reason
5. Execute rollback
```

## Future Enhancements

Planned for Q4 2025:

- [ ] Database migration for API backend
- [ ] Canary deployments
- [ ] A/B testing infrastructure
- [ ] Automated performance regression detection
- [ ] Advanced monitoring dashboards
- [ ] Multi-region deployment support

## Related Documentation

- [Deployment Setup](./deployment-setup.md) - Initial setup guide
- [CI/CD Status](./CI-CD-STATUS.md) - Infrastructure overview
- [Development Workflow](./development-workflow.md) - Development guide

## Support

For deployment issues:

1. Check workflow logs
2. Review this documentation
3. Search existing issues
4. Create new issue with details
5. Contact DevOps team
