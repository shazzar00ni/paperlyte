# DevOps Operations Guide

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** DevOps Team

## Overview

This guide provides day-to-day operational procedures for maintaining and operating Paperlyte's production infrastructure. It covers routine tasks, monitoring, maintenance, and common operational scenarios.

## Daily Operations

### Morning Checklist (Start of Business Day)

**Time Required:** 10-15 minutes

- [ ] **Check service health**
  - [ ] Production site accessible: https://paperlyte.com
  - [ ] Staging site accessible: https://staging.paperlyte.com
  - [ ] No active incidents

- [ ] **Review overnight metrics**

  ```bash
  # Check last 24 hours in monitoring dashboards
  # - Sentry: Error count, new error types
  # - PostHog: User activity, page views
  # - GitHub Actions: Build/deploy status
  ```

  - [ ] Error rate < 0.1%
  - [ ] No unusual traffic patterns
  - [ ] All deployments successful
  - [ ] No security alerts

- [ ] **Check for updates**
  - [ ] GitHub notifications
  - [ ] Dependabot alerts
  - [ ] Security advisories
  - [ ] Service provider status pages

- [ ] **Review support channels**
  - [ ] GitHub issues
  - [ ] User feedback
  - [ ] Social media mentions

### Weekly Tasks

**Time Required:** 30-60 minutes

- [ ] **Dependency updates review** (Monday)

  ```bash
  npm outdated
  npm audit
  ```

  - Review and approve Dependabot PRs
  - Test critical dependency updates
  - Schedule updates for non-critical deps

- [ ] **Performance review** (Wednesday)

  ```bash
  # Run Lighthouse audit
  npm run build
  npm run preview &
  npx lighthouse http://localhost:4173 --view
  ```

  - Compare metrics to baseline
  - Identify performance regressions
  - Plan optimization work if needed

- [ ] **Security scan** (Friday)

  ```bash
  npm audit
  npm run test:run -- tests/integration/security.test.tsx
  ```

  - Review CodeQL results
  - Check for new vulnerabilities
  - Update security documentation

- [ ] **Backup verification** (Friday)
  - Verify git repository accessible
  - Check deployment artifact retention
  - Test configuration backup recovery

- [ ] **Metrics report**
  - Compile weekly metrics
  - Share with team
  - Identify trends and issues

### Monthly Tasks

**Time Required:** 2-4 hours

- [ ] **Full infrastructure review**
  - [ ] Review all monitoring dashboards
  - [ ] Analyze trends and patterns
  - [ ] Identify optimization opportunities

- [ ] **Secret rotation review**
  - [ ] Check API key age
  - [ ] Plan rotation for keys > 90 days
  - [ ] Update secret management documentation

- [ ] **Documentation update**
  - [ ] Review all runbooks
  - [ ] Update deployment procedures
  - [ ] Document new lessons learned

- [ ] **Cost optimization**
  - [ ] Review Netlify/Vercel usage
  - [ ] Check CDN bandwidth
  - [ ] Optimize resource utilization

- [ ] **Team training**
  - [ ] Share operational updates
  - [ ] Review incident responses
  - [ ] Practice DR procedures

### Quarterly Tasks

**Time Required:** 1-2 days

- [ ] **Disaster recovery drill**
  - [ ] Test full system recovery
  - [ ] Practice rollback procedures
  - [ ] Update DR documentation

- [ ] **Security audit**
  - [ ] Full security review
  - [ ] Penetration testing (if budget allows)
  - [ ] Update security measures

- [ ] **Performance optimization**
  - [ ] Deep bundle analysis
  - [ ] Optimize critical paths
  - [ ] Update performance budgets

- [ ] **Infrastructure planning**
  - [ ] Review capacity needs
  - [ ] Plan scaling strategy
  - [ ] Evaluate new tools/services

## Monitoring Operations

### Dashboard Review Schedule

**Sentry (Error Monitoring) - Check 3x daily:**

1. Morning (9:00 AM): Overnight errors
2. Midday (1:00 PM): Current status
3. Evening (5:00 PM): Day wrap-up

**What to look for:**

- New error types
- Error rate spikes
- Affected user count
- Browser/device patterns

**PostHog (Analytics) - Check 2x daily:**

1. Morning (10:00 AM): Previous day summary
2. Afternoon (4:00 PM): Current day trends

**What to look for:**

- Daily active users trend
- Conversion funnel performance
- User engagement metrics
- Feature usage patterns

**GitHub Actions - Check on activity:**

- Monitor after each push to main
- Check after PR merges
- Review deployment status

**What to look for:**

- Build failures
- Test failures
- Deployment errors
- Security scan results

### Alert Response

**When an alert fires:**

1. **Acknowledge** (within 5 minutes)
   - Confirm receipt
   - Assess severity
   - Determine if escalation needed

2. **Investigate** (within 15 minutes)
   - Check monitoring dashboards
   - Review recent changes
   - Identify affected users

3. **Communicate** (within 30 minutes)
   - Notify team
   - Update status channel
   - Set expectations for resolution

4. **Resolve** (based on severity)
   - SEV-1: < 1 hour
   - SEV-2: < 4 hours
   - SEV-3: < 24 hours
   - SEV-4: < 1 week

5. **Document** (within 48 hours)
   - Create incident report
   - Update runbooks
   - Share lessons learned

## Deployment Operations

### Standard Deployment Flow

**Staging Deployment (Automatic):**

```bash
# Triggered by merge to main branch
# 1. Developer creates PR
# 2. PR reviewed and approved
# 3. Merge to main
# 4. GitHub Actions builds and deploys to staging
# 5. Team verifies staging
# 6. Ready for production release
```

**Production Deployment (Release-based):**

```bash
# 1. Verify staging is stable
git checkout main
git pull origin main

# 2. Create release tag
git tag -a v1.2.3 -m "Release v1.2.3: Feature description"
git push origin v1.2.3

# 3. Create GitHub release
gh release create v1.2.3 \
  --title "v1.2.3: Feature Name" \
  --notes "Release notes here"

# 4. Monitor deployment
# GitHub Actions automatically deploys to production

# 5. Verify deployment
curl -I https://paperlyte.com
# Check Sentry and PostHog dashboards
```

### Rollback Procedure

**When to rollback:**

- Critical functionality broken
- Error rate > 5%
- Performance degradation > 50%
- Security vulnerability introduced

**How to rollback:**

```bash
# Option 1: Quick rollback via Netlify
netlify rollback --site paperlyte-prod

# Option 2: Deploy previous version
git checkout v1.2.2  # last known good version
npm ci
npm run build
netlify deploy --prod --dir=dist

# Option 3: Revert commits
git revert HEAD
git push origin main
# Wait for automatic deployment
```

**Post-rollback:**

- Verify site working
- Notify team
- Create incident report
- Plan fix and re-deployment

## Maintenance Windows

### Planned Maintenance

**When to schedule:**

- Major version upgrades
- Infrastructure changes
- Database migrations (future)
- Critical security patches

**How to schedule:**

1. **Announce 72 hours in advance**

   ```markdown
   📢 Scheduled Maintenance

   Date: [Date]
   Time: [Start] - [End] UTC
   Duration: [Estimate]
   Impact: [Description]

   What to expect:

   - [Service impact]
   - [User impact]
   - [Alternative if any]
   ```

2. **Prepare**
   - Create detailed runbook
   - Test in staging
   - Prepare rollback plan
   - Backup everything

3. **Execute**
   - Enable maintenance mode
   - Perform changes
   - Test thoroughly
   - Restore service

4. **Communicate**
   - Confirm completion
   - Thank users for patience
   - Document any issues

### Emergency Maintenance

**For critical issues requiring immediate action:**

1. **Assess urgency**
   - Can it wait?
   - What's the risk?
   - Who's affected?

2. **Minimal notification**

   ```markdown
   🚨 Emergency Maintenance

   We are performing emergency maintenance to resolve [issue].
   Expected duration: [estimate]
   Updates: [frequency]
   ```

3. **Fast execution**
   - Follow abbreviated checklist
   - Monitor closely
   - Document everything

4. **Post-mortem**
   - Why was it urgent?
   - What could we have done better?
   - How can we prevent this?

## Security Operations

### Security Monitoring

**Daily:**

- Review Dependabot alerts
- Check CodeQL scan results
- Monitor failed login attempts (when auth added)
- Review CSP violation reports (when enabled)

**Weekly:**

- Full security audit
- Review access logs
- Check SSL certificate status
- Verify security headers

**Monthly:**

- Rotate non-critical secrets
- Review user permissions
- Update security documentation
- Test security controls

**Quarterly:**

- Rotate all secrets
- Full penetration test (recommended)
- Security team training
- Update security policies

### Security Incident Response

**Detection → Assessment → Containment → Eradication → Recovery → Lessons Learned**

See [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md) for detailed procedures.

### Secret Management

**Current Secrets:**

- Netlify Auth Token
- Sentry DSN (staging + prod)
- PostHog API Key (staging + prod)
- GitHub Personal Access Tokens

**Rotation Schedule:**

- API Keys: Quarterly
- Auth Tokens: Quarterly
- Passwords: Quarterly
- SSH Keys: Annually

**Rotation Procedure:**

```bash
# 1. Generate new secret
# 2. Update in GitHub Secrets
gh secret set SECRET_NAME

# 3. Update in Netlify
netlify env:set SECRET_NAME "value" --context production

# 4. Deploy with new secret
# (Automatic via GitHub Actions)

# 5. Verify new secret works
# Check Sentry/PostHog dashboards

# 6. Revoke old secret
# Delete from Sentry/PostHog/etc.

# 7. Document rotation
# Update secret management log
```

## Performance Operations

### Performance Monitoring

**Key Metrics:**

- **Load Time:** Target < 2s
- **Time to Interactive:** Target < 3s
- **First Contentful Paint:** Target < 1.5s
- **Cumulative Layout Shift:** Target < 0.1
- **Bundle Size:** Main JS < 500KB

**Monitoring Tools:**

- Lighthouse CI (automated)
- Chrome DevTools (manual)
- WebPageTest (comprehensive)
- PostHog session recordings

### Performance Optimization

**When performance degrades:**

1. **Identify bottleneck**

   ```bash
   # Analyze bundle
   npm run build
   npx webpack-bundle-analyzer dist

   # Profile runtime
   # Use Chrome DevTools Performance tab
   ```

2. **Common fixes**
   - Lazy load heavy components
   - Optimize images (WebP, compression)
   - Remove unused dependencies
   - Code splitting
   - Implement caching

3. **Test improvement**

   ```bash
   npm run build
   npm run preview &
   npx lighthouse http://localhost:4173
   ```

4. **Deploy and monitor**
   - Deploy to staging first
   - Verify improvement
   - Deploy to production
   - Monitor for regressions

### Bundle Size Management

**Target Sizes:**

- Main JS bundle: < 200 KB
- Vendor bundle: < 300 KB
- CSS bundle: < 50 KB
- Total initial load: < 500 KB

**Monitor bundle size:**

```bash
npm run build
ls -lh dist/assets/

# Set up budget alert
# If bundle size exceeds threshold, fail build
# Configure in vite.config.ts
```

## Capacity Planning

### Current Capacity

**Static Site Hosting:**

- **Netlify Free Tier:**
  - 100 GB bandwidth/month
  - 300 build minutes/month
  - Unlimited sites
- **Vercel Hobby Tier (backup):**
  - 100 GB bandwidth/month
  - 100 deployments/day
  - Unlimited sites

**Monitoring:**

- Check usage monthly
- Alert at 80% utilization
- Plan upgrade if needed

### Scaling Strategy

**Phase 1: Current (MVP)**

- Static site hosting sufficient
- Client-side storage only
- No backend required

**Phase 2: Q4 2025 (Backend Added)**

- Add API server (Railway/Render)
- Implement database (PostgreSQL)
- Scale based on user growth
- Monitor resource usage

**Phase 3: Growth (2026+)**

- Consider CDN optimization
- Implement edge functions
- Add caching layers
- Scale database horizontally

### Growth Projections

**Current (MVP):**

- Users: < 1,000
- Bandwidth: < 10 GB/month
- Storage: Client-side only

**6 Months:**

- Users: 5,000 - 10,000
- Bandwidth: 50 GB/month
- Storage: Begin backend planning

**12 Months:**

- Users: 50,000+
- Bandwidth: 200 GB/month
- Storage: Cloud database required

## Automation

### Automated Tasks

**GitHub Actions:**

- Build and test on every commit
- Deploy staging on merge to main
- Deploy production on release
- Run security scans daily
- Performance checks weekly

**Dependabot:**

- Weekly dependency updates
- Security patch PRs
- Version updates

**Future Automation:**

- Automated backup verification
- Synthetic monitoring
- Auto-scaling triggers
- Alert escalation

### Manual Tasks (Cannot Automate)

- Production release approval
- Security incident response
- Performance optimization decisions
- Architecture changes
- User communication

## Troubleshooting Common Issues

### Site is Down

```bash
# 1. Verify it's actually down
curl -I https://paperlyte.com

# 2. Check hosting status
# Netlify: https://www.netlifystatus.com
# Vercel: https://www.vercel-status.com

# 3. Check deployment status
netlify status
gh run list --limit 1

# 4. If deployment failed, redeploy
netlify deploy --prod --dir=dist

# 5. If hosting down, switch to backup
# Update DNS to point to Vercel
```

### High Error Rate

```bash
# 1. Check Sentry dashboard
# Identify top errors

# 2. Check recent deployments
git log --oneline -n 5

# 3. If new error from recent deploy, rollback
netlify rollback

# 4. Investigate error in staging
# Reproduce and fix
# Deploy fix
```

### Slow Performance

```bash
# 1. Run Lighthouse audit
npx lighthouse https://paperlyte.com

# 2. Check bundle sizes
npm run build
ls -lh dist/assets/

# 3. Review PostHog session recordings
# Identify slow operations

# 4. Optimize and test
# Deploy improvement
```

### Build Failures

```bash
# 1. Check GitHub Actions logs
gh run view

# 2. Common causes:
# - Dependency installation failure
# - TypeScript errors
# - Test failures
# - Out of memory

# 3. Fix locally and test
npm ci
npm run lint
npm run type-check
npm run test:run
npm run build

# 4. Commit fix
git commit -am "fix: resolve build issue"
git push
```

## On-Call Procedures

### On-Call Responsibilities

**Primary On-Call:**

- Respond to alerts within 15 minutes
- Triage and resolve incidents
- Escalate if needed
- Document incidents

**Secondary On-Call:**

- Backup for primary
- Assist with complex issues
- Available for escalation

**On-Call Schedule:**

- Week-long rotations
- Handoff every Monday 9:00 AM
- Document handoff in Slack

### Handoff Checklist

**Outgoing on-call:**

- [ ] Summary of past week
- [ ] Any ongoing issues
- [ ] Upcoming maintenance
- [ ] Notes and tips

**Incoming on-call:**

- [ ] Verify access to all systems
- [ ] Test alert delivery
- [ ] Review recent incidents
- [ ] Check calendar for events

## Tools & Access

### Required Access

- [ ] GitHub (admin access)
- [ ] Netlify (team access)
- [ ] Vercel (team access)
- [ ] Sentry (admin access)
- [ ] PostHog (admin access)
- [ ] Slack (workspace member)

### CLI Tools Setup

```bash
# Install required tools
npm install -g netlify-cli
npm install -g vercel
brew install gh  # GitHub CLI

# Authenticate
netlify login
vercel login
gh auth login

# Verify access
netlify status
vercel whoami
gh auth status
```

### Dashboard Bookmarks

**Monitoring:**

- Sentry: https://sentry.io/organizations/paperlyte
- PostHog: https://app.posthog.com
- Lighthouse: https://googlechrome.github.io/lighthouse/

**Hosting:**

- Netlify: https://app.netlify.com
- Vercel: https://vercel.com/dashboard
- GitHub: https://github.com/shazzar00ni/paperlyte

**Status Pages:**

- Netlify Status: https://www.netlifystatus.com
- Vercel Status: https://www.vercel-status.com
- GitHub Status: https://www.githubstatus.com

## Documentation Index

**Operational Guides:**

- [Incident Response Runbook](./INCIDENT_RESPONSE_RUNBOOK.md)
- [Monitoring & Alerts](./MONITORING_ALERTS.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Security Hardening](./SECURITY_HARDENING.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

**Development Docs:**

- [Development Workflow](./development-workflow.md)
- [Testing Guide](./TESTING.md)
- [CI/CD Status](./CI-CD-STATUS.md)

**Security & Compliance:**

- [Security Policy](../SECURITY.md)
- [GDPR Compliance](./gdpr-compliance-report.md)
- [Security Audit Report](./security-audit-report.md)

---

**Questions or Issues?**

- Create GitHub issue: https://github.com/shazzar00ni/paperlyte/issues
- Contact DevOps: devops@paperlyte.com
- Slack: #devops

**Last Reviewed:** 2025-11-02  
**Next Review:** 2025-12-02 (Monthly)
