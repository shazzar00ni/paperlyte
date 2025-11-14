# Deployment & Release Checklist

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** DevOps Team

## Overview

This checklist ensures safe, reliable deployments to staging and production environments. Follow each step sequentially and mark items as complete before proceeding.

## Pre-Deployment Checklist

### Code Quality & Testing

- [ ] **All tests passing**

  ```bash
  npm run test:run
  npm run test:e2e
  ```

  - Unit tests: ✅ Passing
  - Integration tests: ✅ Passing
  - E2E tests: ✅ Passing

- [ ] **Linting passes**

  ```bash
  npm run lint
  npm run format:check
  ```

  - No ESLint errors
  - Code formatted consistently

- [ ] **Type checking passes**

  ```bash
  npm run type-check
  ```

  - No TypeScript errors
  - All types properly defined

- [ ] **Build succeeds**

  ```bash
  npm run build
  ```

  - Build completes without errors
  - Bundle sizes within limits (< 500KB for main JS)
  - No console warnings

- [ ] **Security audit clean**

  ```bash
  npm audit --audit-level=moderate
  ```

  - No high/critical vulnerabilities
  - All dependencies up to date (or justification documented)

- [ ] **Performance check**

  ```bash
  npm run preview &
  npx lighthouse http://localhost:4173 --only-categories=performance
  ```

  - Performance score > 90
  - Core Web Vitals passing

### Code Review

- [ ] **Pull request approved** by at least 1 reviewer
- [ ] **All review comments addressed**
- [ ] **CI/CD pipeline green** (all checks passing)
- [ ] **No merge conflicts** with target branch
- [ ] **Branch up to date** with latest main/develop

### Documentation

- [ ] **CHANGELOG.md updated** with new features/fixes
- [ ] **README.md updated** if installation/setup changed
- [ ] **API documentation updated** (if applicable)
- [ ] **User-facing documentation updated** (if features changed)
- [ ] **Release notes drafted** (for production deployments)

### Environment Configuration

- [ ] **Environment variables verified**
  - [ ] Staging secrets configured in GitHub/Netlify
  - [ ] Production secrets configured in GitHub/Netlify
  - [ ] No hardcoded secrets in code

- [ ] **Feature flags configured** (if using feature flags)
  - [ ] Staging: All features enabled for testing
  - [ ] Production: Only stable features enabled

- [ ] **Third-party services ready**
  - [ ] Sentry DSN configured for environment
  - [ ] PostHog API key configured for environment
  - [ ] Any external APIs accessible

## Staging Deployment Checklist

### Pre-Staging Deployment

- [ ] **Staging environment clean**
  - Previous deployment successful
  - No ongoing incidents
  - Monitoring active

- [ ] **Database migration tested** (when backend added)
  - Migration scripts validated
  - Rollback plan prepared
  - Data backup completed

### Staging Deployment Process

- [ ] **Merge to main branch** (triggers staging deployment)

  ```bash
  git checkout main
  git pull origin main
  git merge --no-ff feature/branch-name
  git push origin main
  ```

- [ ] **Monitor deployment pipeline**
  - GitHub Actions workflow started
  - Build job completed successfully
  - Deployment job running

- [ ] **Verify deployment success**
  - Netlify deployment shows "Published"
  - Deployment URL accessible
  - No error alerts from monitoring

### Post-Staging Deployment Verification

- [ ] **Smoke tests pass**
  - [ ] Homepage loads correctly
  - [ ] Critical user flows work (note creation, editing, deletion)
  - [ ] Waitlist signup functional
  - [ ] Navigation working

- [ ] **Visual regression check**
  - [ ] UI renders correctly on desktop
  - [ ] UI renders correctly on mobile
  - [ ] No layout shifts or broken styles
  - [ ] Images and assets load

- [ ] **Functionality testing**
  - [ ] Create new note
  - [ ] Edit existing note
  - [ ] Delete note
  - [ ] Auto-save working
  - [ ] Export functionality
  - [ ] Keyboard shortcuts working

- [ ] **Performance verification**

  ```bash
  # Test staging URL
  npx lighthouse https://staging.paperlyte.com --only-categories=performance
  ```

  - [ ] Load time < 2 seconds
  - [ ] Time to Interactive < 3 seconds
  - [ ] No performance regressions

- [ ] **Cross-browser testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari
  - [ ] Mobile Chrome

- [ ] **Monitoring verification**
  - [ ] Sentry receiving events
  - [ ] PostHog tracking page views
  - [ ] No error spikes in Sentry
  - [ ] Analytics data flowing correctly

- [ ] **Security headers verified**

  ```bash
  curl -I https://staging.paperlyte.com
  ```

  - [ ] HSTS header present
  - [ ] CSP header present
  - [ ] X-Frame-Options set
  - [ ] All security headers configured

### Staging Approval

- [ ] **QA sign-off** (if QA team exists)
- [ ] **Product owner approval**
- [ ] **No blocking issues found**
- [ ] **Staging stable for 24 hours** (for major releases)

## Production Deployment Checklist

### Pre-Production Deployment

- [ ] **All staging checks passed**
- [ ] **Team notified of deployment**
  - [ ] Slack announcement in #deployments
  - [ ] On-call engineer aware
  - [ ] Stakeholders informed (for major releases)

- [ ] **Production backup verified** (when backend exists)
  - [ ] Database backup completed
  - [ ] Backup tested and restorable
  - [ ] Backup retention policy followed

- [ ] **Rollback plan prepared**
  - [ ] Previous version identified
  - [ ] Rollback procedure documented
  - [ ] Team knows how to execute rollback

- [ ] **Maintenance window planned** (if needed)
  - [ ] Users notified (if downtime expected)
  - [ ] Status page updated
  - [ ] Communication templates ready

### Production Deployment Process

**Option 1: GitHub Release (Preferred)**

1. [ ] **Create GitHub release**

   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.3 -m "Release v1.2.3: [description]"
   git push origin v1.2.3
   ```

2. [ ] **Publish release on GitHub**
   - Navigate to Releases page
   - Create new release from tag
   - Add release notes
   - Mark as latest release

3. [ ] **Monitor deployment pipeline**
   - GitHub Actions triggered by release
   - Production deployment workflow running
   - All jobs green

**Option 2: Manual Deployment (Emergency)**

```bash
# Build production bundle
VITE_ENVIRONMENT=production npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist

# OR deploy to Vercel
vercel --prod
```

### Post-Production Deployment Verification

**Immediate Checks (0-5 minutes):**

- [ ] **Deployment successful**
  - [ ] Netlify shows "Published" status
  - [ ] Production URL accessible: https://paperlyte.com
  - [ ] SSL certificate valid

- [ ] **Critical functionality working**
  - [ ] Homepage loads
  - [ ] Can create new note
  - [ ] Can save note
  - [ ] Waitlist signup works

- [ ] **No critical errors**

  ```bash
  # Check Sentry for new errors
  # Navigate to Sentry dashboard
  # Filter by: last 5 minutes, environment: production
  ```

  - [ ] Error rate < 0.1%
  - [ ] No new error types introduced

**Extended Monitoring (5-30 minutes):**

- [ ] **Performance metrics stable**
  - [ ] Response times normal (< 2s P95)
  - [ ] No latency spikes
  - [ ] Core Web Vitals passing

- [ ] **User analytics normal**
  - [ ] Page views tracking
  - [ ] User actions recording
  - [ ] No drop in traffic

- [ ] **Error rate stable**
  - [ ] Error rate < 0.1%
  - [ ] No new error patterns
  - [ ] All error types known/expected

- [ ] **Resource usage normal**
  - [ ] Bundle sizes acceptable
  - [ ] CDN cache hit rate good
  - [ ] No bandwidth spikes

**Full Verification (30-60 minutes):**

- [ ] **Comprehensive smoke tests**
  - [ ] All user flows tested
  - [ ] Cross-browser spot checks
  - [ ] Mobile testing

- [ ] **Integration verification**
  - [ ] Sentry integration working
  - [ ] PostHog integration working
  - [ ] Analytics data flowing

- [ ] **Security validation**

  ```bash
  # Run security header check
  curl -I https://paperlyte.com | grep -E "(Strict-Transport|Content-Security|X-Frame)"
  ```

  - [ ] All security headers present
  - [ ] HTTPS enforced
  - [ ] No mixed content warnings

### Production Monitoring Period

**First 2 Hours:**

- [ ] Monitor Sentry dashboard every 15 minutes
- [ ] Check PostHog analytics every 30 minutes
- [ ] Watch for user reports on support channels
- [ ] On-call engineer available

**First 24 Hours:**

- [ ] Check metrics every 2-4 hours
- [ ] Review error logs
- [ ] Monitor user feedback
- [ ] Watch for trend changes

**First Week:**

- [ ] Daily metric review
- [ ] Weekly performance report
- [ ] User feedback analysis
- [ ] Plan any hotfixes if needed

## Rollback Procedures

### When to Rollback

Rollback immediately if:

- Critical feature completely broken
- Error rate > 5%
- Data loss or corruption detected
- Security vulnerability introduced
- Performance degradation > 50%

### Rollback Steps

**Quick Rollback (Netlify):**

```bash
# List recent deployments
netlify list --site paperlyte-prod

# Rollback to previous deployment
netlify rollback --site paperlyte-prod
```

**Manual Rollback:**

```bash
# Find last good commit/tag
git log --oneline -n 10

# Deploy previous version
git checkout v1.2.2  # previous stable version
npm ci
npm run build
netlify deploy --prod
```

**Post-Rollback:**

- [ ] Verify rollback successful
- [ ] Confirm site working correctly
- [ ] Notify team of rollback
- [ ] Create incident report
- [ ] Investigate and fix issues
- [ ] Plan new deployment with fixes

## Post-Deployment Tasks

### Immediate (Within 1 hour)

- [ ] **Update deployment log**
  - Document deployment time
  - Record version deployed
  - Note any issues encountered

- [ ] **Team notification**

  ```
  ✅ Production Deployment Complete

  Version: v1.2.3
  Deployed: 2025-11-02 14:30 UTC
  Changes: [brief summary]
  Status: Stable
  Monitoring: Active
  ```

- [ ] **Update status page** (if used)
  - Mark deployment complete
  - Remove maintenance notices
  - Update version information

### Short-term (Within 24 hours)

- [ ] **Performance report**
  - Compare metrics to baseline
  - Document any improvements/regressions
  - Share with team

- [ ] **Error review**
  - Review all errors in Sentry
  - Triage new error types
  - Create tickets for issues

- [ ] **User feedback collection**
  - Monitor support channels
  - Check social media mentions
  - Review analytics for usage patterns

### Medium-term (Within 1 week)

- [ ] **Post-deployment retrospective**
  - What went well?
  - What could be improved?
  - Action items for next deployment

- [ ] **Documentation updates**
  - Update runbooks if needed
  - Document any new procedures
  - Share lessons learned

- [ ] **Metrics analysis**
  - Full performance analysis
  - User engagement trends
  - Conversion funnel review

## Emergency Deployment Checklist

### For Critical Hotfixes

**Abbreviated Process:**

- [ ] **Verify criticality** (SEV-1 or SEV-2 incident)
- [ ] **Create hotfix branch** from production
  ```bash
  git checkout -b hotfix/critical-issue
  ```
- [ ] **Implement minimal fix** (smallest possible change)
- [ ] **Test fix locally**
  ```bash
  npm run lint
  npm run type-check
  npm run test:run
  npm run build
  ```
- [ ] **Get emergency approval** (team lead or on-call)
- [ ] **Deploy to staging first** (even for hotfixes)
- [ ] **Verify fix in staging**
- [ ] **Deploy to production**
- [ ] **Monitor closely** for 1 hour
- [ ] **Create post-mortem** within 24 hours

## Deployment Metrics

### Track These Metrics

**Deployment Frequency:**

- Target: Multiple deployments per week
- Current: [track actual frequency]

**Lead Time:**

- Target: < 1 day from commit to production
- Current: [track actual time]

**Change Failure Rate:**

- Target: < 15%
- Current: [track failures vs total deployments]

**Mean Time to Recovery (MTTR):**

- Target: < 1 hour
- Current: [track recovery time]

**Deployment Success Rate:**

- Target: > 95%
- Current: [track successful vs failed]

## Tools & Resources

### Deployment Commands

```bash
# Build production
npm run build

# Deploy to staging (automatic on merge to main)
git push origin main

# Create production release
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Manual production deploy (emergency)
netlify deploy --prod --dir=dist
vercel --prod

# Rollback
netlify rollback
```

### Monitoring Dashboards

- **Sentry:** https://sentry.io/organizations/paperlyte/dashboard/
- **PostHog:** https://app.posthog.com/project/[project-id]
- **Netlify:** https://app.netlify.com/sites/paperlyte-prod
- **GitHub Actions:** https://github.com/shazzar00ni/paperlyte/actions

### Documentation Links

- [Incident Response Runbook](./INCIDENT_RESPONSE_RUNBOOK.md)
- [Disaster Recovery Plan](./DISASTER_RECOVERY.md)
- [Monitoring & Alerts](./MONITORING_ALERTS.md)
- [Security Hardening](./SECURITY_HARDENING.md)

## Sign-Off

**Deployment Lead:** **\*\*\*\***\_\_\_**\*\*\*\*** Date: \***\*\_\_\_\*\***

**QA Approval:** **\*\*\*\***\_\_\_**\*\*\*\*** Date: \***\*\_\_\_\*\***

**Product Owner:** **\*\*\*\***\_\_\_**\*\*\*\*** Date: \***\*\_\_\_\*\***

---

**Notes:**

- This checklist should be completed for every production deployment
- Keep a record of completed checklists for audit purposes
- Update this checklist based on lessons learned

**Last Reviewed:** 2025-11-02  
**Next Review:** 2025-12-02 (Monthly)
