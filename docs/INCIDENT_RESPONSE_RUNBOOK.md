# Incident Response Runbook

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** DevOps Team

## Overview

This runbook provides step-by-step procedures for responding to production incidents in Paperlyte. It covers detection, assessment, containment, resolution, and post-incident review processes.

## Incident Severity Levels

### SEV-1: Critical

- **Impact:** Complete service outage or data loss
- **Response Time:** Immediate (< 5 minutes)
- **Examples:** Site down, database unavailable, data corruption
- **Escalation:** Notify all on-call engineers and management

### SEV-2: High

- **Impact:** Major feature unavailable or severe performance degradation
- **Response Time:** < 30 minutes
- **Examples:** Note editor broken, sync failures, authentication issues
- **Escalation:** Notify on-call engineer and team lead

### SEV-3: Medium

- **Impact:** Minor feature degradation or isolated user issues
- **Response Time:** < 2 hours
- **Examples:** UI glitches, slow loading times, analytics errors
- **Escalation:** Create ticket, assign to next sprint

### SEV-4: Low

- **Impact:** Cosmetic issues or feature enhancement
- **Response Time:** Next business day
- **Examples:** Styling inconsistencies, minor UX improvements
- **Escalation:** Add to backlog

## Incident Response Process

### Phase 1: Detection (0-5 minutes)

#### Monitoring Sources

- **Sentry Alerts:** Error rate spikes, new error types
- **PostHog Alerts:** Traffic drops, conversion rate changes
- **Netlify/Vercel Status:** Deployment failures, build errors
- **User Reports:** Support tickets, social media mentions
- **GitHub Actions:** CI/CD pipeline failures

#### Initial Actions

1. **Acknowledge the incident** in monitoring system
2. **Determine severity** using criteria above
3. **Create incident channel** (e.g., Slack #incident-YYYYMMDD-XX)
4. **Notify stakeholders** based on severity
5. **Start incident log** with timestamp and initial assessment

### Phase 2: Assessment (5-15 minutes)

#### Gather Information

```bash
# Check deployment status
netlify status
vercel ls

# Review recent deployments
git log --oneline -n 10
git show HEAD

# Check error rates in Sentry
# Navigate to: https://sentry.io/organizations/paperlyte/issues/

# Review analytics in PostHog
# Navigate to: https://app.posthog.com/project/[project-id]

# Check CI/CD pipeline status
gh workflow list
gh run list --limit 5
```

#### Key Questions

- What changed recently? (code, config, dependencies)
- What percentage of users are affected?
- Is the issue isolated to specific browsers/devices?
- Are there any error patterns in logs?
- Can the issue be reproduced?

### Phase 3: Containment (15-30 minutes)

#### Option 1: Rollback to Previous Version

```bash
# Identify last known good deployment
git log --oneline --decorate

# Rollback using Netlify CLI
netlify rollback

# OR create emergency hotfix release
git checkout [last-good-commit]
git tag -a v[version]-hotfix -m "Emergency rollback"
git push origin v[version]-hotfix

# Monitor deployment
netlify watch
```

#### Option 2: Feature Toggle/Circuit Breaker

```typescript
// In src/config/env.ts - add emergency feature flag
export const config = {
  features: {
    // Emergency disable problematic feature
    noteEditorEnabled: getOptionalEnvVar('VITE_ENABLE_EDITOR') !== 'false',
  }
}

// Deploy with feature disabled
VITE_ENABLE_EDITOR=false npm run build
netlify deploy --prod
```

#### Option 3: Emergency Maintenance Mode

```bash
# Create maintenance page
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Paperlyte - Maintenance</title>
  <meta http-equiv="refresh" content="60">
</head>
<body>
  <h1>We'll be right back!</h1>
  <p>Paperlyte is currently undergoing maintenance. Please check back shortly.</p>
</body>
</html>
EOF

# Deploy maintenance page
netlify deploy --prod --dir=dist
```

### Phase 4: Investigation (30-60 minutes)

#### Review Logs and Metrics

```bash
# Export Sentry errors for analysis
# Use Sentry UI to filter and export recent errors

# Review PostHog user sessions
# Navigate to session recordings for affected users

# Check browser console errors
# Test in multiple browsers and devices

# Review network requests
# Use browser DevTools Network tab
```

#### Common Issue Patterns

##### Issue: High Error Rate After Deployment

```bash
# Check for breaking changes
git diff [previous-commit] [current-commit]

# Review dependency changes
git show [commit]:package.json
git show [commit]:package-lock.json

# Check for environment variable changes
git show [commit]:vite.config.ts
git show [commit]:netlify.toml
```

##### Issue: Performance Degradation

```bash
# Run Lighthouse audit
npm run build
npm run preview &
npx lighthouse http://localhost:4173 --view

# Check bundle sizes
npm run build
ls -lh dist/assets/

# Analyze bundle composition
npx vite-bundle-visualizer dist
```

##### Issue: Data Loss or Corruption

```bash
# Check localStorage structure (in browser console)
console.table(Object.keys(localStorage))
console.log(JSON.parse(localStorage.getItem('paperlyte_notes')))

# Verify data service operations
# Review src/services/dataService.ts recent changes
git log --oneline -p src/services/dataService.ts
```

### Phase 5: Resolution (1-4 hours)

#### Fix Development Process

1. **Create hotfix branch**

   ```bash
   git checkout -b hotfix/issue-description
   ```

2. **Implement minimal fix**
   - Focus on immediate resolution, not perfect solution
   - Add comments explaining the fix
   - Include issue/incident reference

3. **Test thoroughly**

   ```bash
   npm run lint
   npm run type-check
   npm run test:run
   npm run build
   npm run preview
   ```

4. **Deploy fix**

   ```bash
   git commit -m "hotfix: [description] (refs: #incident-XX)"
   git push origin hotfix/issue-description

   # Create release for production
   git tag -a v[version] -m "Hotfix: [description]"
   git push origin v[version]
   ```

5. **Verify resolution**
   - Monitor error rates in Sentry
   - Check user analytics in PostHog
   - Test affected functionality manually
   - Wait 15-30 minutes to confirm stability

### Phase 6: Communication

#### Internal Updates

**Slack Template:**

```
🚨 Incident Update - [Severity]

Status: [Investigating|Identified|Monitoring|Resolved]
Impact: [Description]
Affected Users: [Estimate]
Action Taken: [Summary]
Next Update: [Timeframe]

Incident Lead: @[name]
Incident Channel: #incident-YYYYMMDD-XX
```

#### External Communication (SEV-1/SEV-2 only)

**Status Page Update:**

```markdown
## [Timestamp] - Service Disruption

We are currently experiencing issues with [feature/service].
Our team is actively investigating and working on a resolution.

Impact: [Brief description]
Status: [Investigating/Identified/Monitoring/Resolved]
Last Update: [Timestamp]

We will provide updates every 30 minutes until resolved.
```

**User Notification (if needed):**

```markdown
We're aware of an issue affecting [feature].
Your data is safe, and we're working on a fix.

Estimated Resolution: [Timeframe]
Workaround: [If available]

Follow updates: [Status page link]
```

### Phase 7: Recovery Verification (1-2 hours)

#### Post-Deployment Checklist

- [ ] Error rate returned to baseline (< 0.1% error rate)
- [ ] Performance metrics normal (Core Web Vitals green)
- [ ] User analytics showing normal usage patterns
- [ ] No new related error reports
- [ ] All critical user flows tested and working
- [ ] Monitoring alerts cleared
- [ ] Status page updated to "Resolved"

#### Monitoring Period

- **Duration:** 2-4 hours after resolution
- **Frequency:** Check metrics every 15 minutes
- **Escalation:** If issues recur, reopen incident at higher severity

### Phase 8: Post-Incident Review (Within 48 hours)

#### Incident Report Template

```markdown
# Post-Incident Review: [Incident Title]

**Incident ID:** INC-YYYYMMDD-XX
**Date:** [Date]
**Duration:** [Total time from detection to resolution]
**Severity:** [SEV-X]
**Incident Commander:** [Name]

## Summary

[2-3 sentence overview of what happened]

## Timeline

| Time    | Event                                |
| ------- | ------------------------------------ |
| [HH:MM] | Incident detected via [source]       |
| [HH:MM] | Severity assessed as [SEV-X]         |
| [HH:MM] | Root cause identified: [description] |
| [HH:MM] | Fix deployed to production           |
| [HH:MM] | Incident resolved and monitoring     |

## Impact

- **Users Affected:** [Number/percentage]
- **Duration:** [Time from detection to resolution]
- **Revenue Impact:** [If applicable]
- **Data Loss:** [None/Description]

## Root Cause

[Detailed explanation of what caused the incident]

## Resolution

[Description of how the incident was resolved]

## Action Items

- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]
- [ ] [Action item 3] - Owner: [Name] - Due: [Date]

## Lessons Learned

### What Went Well

- [Point 1]
- [Point 2]

### What Could Be Improved

- [Point 1]
- [Point 2]

## Prevention

[Steps to prevent similar incidents in the future]
```

## Common Incident Scenarios

### Scenario 1: Deployment Failure

**Symptoms:** Build fails, deployment blocked, site shows old version

**Quick Resolution:**

```bash
# Check deployment logs
netlify status
vercel logs

# Common causes and fixes
# 1. Missing environment variables
netlify env:list
netlify env:set VITE_POSTHOG_API_KEY "value"

# 2. Dependency installation failure
rm -rf node_modules package-lock.json
npm install
npm run build

# 3. Build script errors
npm run lint:fix
npm run type-check
npm run build
```

### Scenario 2: Data Loss Incident

**Symptoms:** Users reporting lost notes, localStorage cleared

**Quick Resolution:**

```javascript
// Emergency data recovery script (run in browser console)
// Check for backup in sessionStorage or temporary storage
const backup = sessionStorage.getItem('paperlyte_notes_backup')
if (backup) {
  localStorage.setItem('paperlyte_notes', backup)
  location.reload()
}

// Check IndexedDB (future implementation)
const request = indexedDB.open('paperlyte_db')
request.onsuccess = event => {
  const db = event.target.result
  // Export data from IndexedDB
}
```

**Preventive Measures:**

1. Implement automatic cloud backup (Q4 2025)
2. Add localStorage quota monitoring
3. Implement export reminder notifications
4. Add data validation before saving

### Scenario 3: Performance Degradation

**Symptoms:** Slow page loads, high bounce rate, user complaints

**Quick Resolution:**

```bash
# Analyze bundle size
npm run build
ls -lh dist/assets/

# Check for large dependencies
npx webpack-bundle-analyzer dist --mode static

# Emergency performance fix
# 1. Enable aggressive caching in netlify.toml
# 2. Lazy load non-critical components
# 3. Optimize images and assets
# 4. Remove unnecessary analytics/monitoring temporarily
```

### Scenario 4: Security Incident

**Symptoms:** XSS reports, CSP violations, unauthorized access attempts

**Immediate Actions:**

1. **DO NOT PANIC** - Most reports are false positives
2. **Verify the report** - Reproduce the issue
3. **If confirmed:**
   ```bash
   # Deploy with stricter CSP immediately
   # Update netlify.toml security headers
   git checkout -b hotfix/security-fix
   # Make changes to security headers
   git commit -m "security: tighten CSP headers"
   git push origin hotfix/security-fix
   # Create emergency release
   ```
4. **Notify security team:** security@paperlyte.com
5. **Document in security log:** docs/security-incidents.md
6. **Follow responsible disclosure practices**

### Scenario 5: Third-Party Service Outage

**Symptoms:** Sentry/PostHog/Netlify unavailable

**Quick Resolution:**

```bash
# Check service status pages
curl https://status.sentry.io
curl https://status.posthog.com
curl https://www.netlifystatus.com

# If third-party is down
# 1. Verify app still functions without analytics/monitoring
# 2. Implement circuit breaker pattern if needed
# 3. Queue events for later processing (future enhancement)
# 4. Communicate to users if customer-facing features affected
```

## Emergency Contacts

### On-Call Engineers

- **Primary:** [Name] - [Phone] - [Email]
- **Secondary:** [Name] - [Phone] - [Email]
- **Escalation:** [Team Lead] - [Phone] - [Email]

### Service Providers

- **Netlify Support:** https://answers.netlify.com
- **Vercel Support:** https://vercel.com/support
- **Sentry Support:** support@sentry.io
- **PostHog Support:** https://posthog.com/support

### External Contacts

- **Domain Registrar:** [Contact info]
- **CDN Provider:** [Contact info]
- **Security Researcher Contact:** security@paperlyte.com

## Tools and Access

### Required Access

- [ ] GitHub repository (write access)
- [ ] Netlify/Vercel deployment access
- [ ] Sentry error monitoring dashboard
- [ ] PostHog analytics dashboard
- [ ] Slack incident channel creation permissions
- [ ] Status page update permissions

### Essential Tools

```bash
# Install required CLI tools
npm install -g netlify-cli
npm install -g vercel
brew install gh  # GitHub CLI
```

### Monitoring Dashboards

- **Sentry:** https://sentry.io/organizations/paperlyte
- **PostHog:** https://app.posthog.com
- **Netlify:** https://app.netlify.com
- **Vercel:** https://vercel.com/dashboard
- **GitHub Actions:** https://github.com/shazzar00ni/paperlyte/actions

## Appendix

### A. Incident Log Template

```markdown
# Incident Log: INC-YYYYMMDD-XX

| Time    | Event                 | Owner  | Notes     |
| ------- | --------------------- | ------ | --------- |
| [HH:MM] | Incident detected     | [Name] | [Details] |
| [HH:MM] | Initial assessment    | [Name] | [Details] |
| [HH:MM] | Stakeholders notified | [Name] | [Details] |
| [HH:MM] | Root cause identified | [Name] | [Details] |
| [HH:MM] | Fix deployed          | [Name] | [Details] |
| [HH:MM] | Resolution verified   | [Name] | [Details] |
| [HH:MM] | Incident closed       | [Name] | [Details] |
```

### B. Quick Reference Commands

```bash
# Emergency rollback
netlify rollback --site paperlyte-prod

# Check recent deployments
netlify list-sites
vercel list

# View live logs
netlify logs --site paperlyte-prod
vercel logs [deployment-url]

# Force rebuild
netlify deploy --prod --trigger-build
vercel --prod --force

# Clear CDN cache
netlify cache:clear
vercel env pull
```

### C. Status Codes and Meanings

- **200:** Success - everything working normally
- **404:** Not Found - broken links, missing assets
- **500:** Server Error - application crash, critical bug
- **502/503:** Bad Gateway/Service Unavailable - hosting provider issue
- **CORS Error:** CSP or security header misconfiguration

---

**Remember:** Stay calm, communicate clearly, and prioritize user data safety above all else.

**Last Reviewed:** 2025-11-02  
**Next Review:** 2025-12-02 (Monthly)
