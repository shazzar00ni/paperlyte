# Disaster Recovery & Backup Strategy

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Owner:** DevOps Team  
**RTO (Recovery Time Objective):** 1 hour  
**RPO (Recovery Point Objective):** 24 hours

## Overview

This document outlines Paperlyte's disaster recovery and backup procedures to ensure business continuity in the event of service outages, data loss, or infrastructure failures.

## Current Architecture (MVP)

### Data Storage

- **Primary Storage:** Browser localStorage (client-side only)
- **No Server-Side Storage:** All data stored locally on user devices
- **Backup Responsibility:** Users manually export their notes

### Infrastructure

- **Hosting:** Netlify (primary) and Vercel (secondary)
- **Source Code:** GitHub (git repository)
- **CI/CD:** GitHub Actions
- **DNS:** [Domain registrar]
- **CDN:** Netlify/Vercel built-in CDN

### Risk Assessment

- **Data Loss Risk:** LOW (client-side storage, user-controlled)
- **Service Availability Risk:** LOW (static site, multiple hosting providers)
- **Code Loss Risk:** MINIMAL (Git version control, GitHub)

## Backup Strategy

### 1. Source Code Backup

**Primary Repository:** GitHub

- **Frequency:** Real-time (every commit)
- **Retention:** Unlimited (all commits preserved)
- **Protection:** Branch protection rules on `main`

**Backup Locations:**

```bash
# Primary: GitHub
https://github.com/shazzar00ni/paperlyte

# Local Development Clones (team members)
Multiple developer machines with full git history

# Optional: Mirror Repository (recommended)
# Create mirror on GitLab or Bitbucket for redundancy
git clone --mirror https://github.com/shazzar00ni/paperlyte.git
cd paperlyte.git
git remote add gitlab git@gitlab.com:paperlyte/paperlyte.git
git push --mirror gitlab
```

**Recovery Procedure:**

```bash
# If GitHub unavailable, restore from mirror
git clone https://gitlab.com/paperlyte/paperlyte.git
cd paperlyte
npm ci
npm run build
# Deploy to Netlify/Vercel
```

**Estimated Recovery Time:** < 15 minutes

### 2. Deployment Artifacts Backup

**Build Artifacts:**

- **Location:** GitHub Actions artifacts
- **Retention:** 90 days (GitHub default)
- **Storage:** S3 or similar (optional for long-term storage)

**Backup Deployments:**

```bash
# Netlify preserves last 5 deployments automatically
netlify list-deploys --site paperlyte-prod | head -5

# Manual backup of production build
npm run build
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz dist/
aws s3 cp backup-*.tar.gz s3://paperlyte-backups/builds/
```

**Recovery Procedure:**

```bash
# Restore from previous deployment
netlify rollback --site paperlyte-prod

# OR deploy from backup artifact
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
netlify deploy --dir=dist --prod --site paperlyte-prod
```

**Estimated Recovery Time:** < 5 minutes

### 3. Configuration Backup

**Critical Configuration Files:**

- `netlify.toml` - Netlify deployment config
- `vercel.json` - Vercel deployment config
- `.github/workflows/*.yml` - CI/CD pipelines
- `package.json` / `package-lock.json` - Dependencies
- `vite.config.ts` - Build configuration
- Environment variables (stored in hosting platform dashboards)

**Backup Procedure:**

```bash
# Create configuration snapshot
mkdir -p backups/config
cp netlify.toml backups/config/
cp vercel.json backups/config/
cp -r .github/workflows backups/config/workflows/
cp package*.json backups/config/
tar -czf config-backup-$(date +%Y%m%d).tar.gz backups/config/

# Store securely
# Option 1: Encrypted local storage
gpg --encrypt --recipient admin@paperlyte.com config-backup-*.tar.gz

# Option 2: Secure cloud storage
aws s3 cp config-backup-*.tar.gz s3://paperlyte-backups/config/ --sse
```

**Recovery Procedure:**

```bash
# Restore configuration
tar -xzf config-backup-YYYYMMDD.tar.gz
cp backups/config/* ./

# Re-configure hosting platforms
netlify init
vercel link
```

**Estimated Recovery Time:** < 30 minutes

### 4. Environment Variables Backup

**Critical Secrets:**

- Netlify authentication tokens
- Sentry DSN keys
- PostHog API keys
- GitHub Personal Access Tokens

**Backup Procedure:**

```bash
# Export environment variables (manually, securely)
# DO NOT commit to git!

# Create encrypted backup
cat > env-backup.txt << EOF
NETLIFY_AUTH_TOKEN=[redacted]
NETLIFY_PROD_SITE_ID=[redacted]
VITE_POSTHOG_API_KEY_PROD=[redacted]
VITE_SENTRY_DSN_PROD=[redacted]
EOF

# Encrypt and store securely
gpg --encrypt --recipient admin@paperlyte.com env-backup.txt
# Store gpg file in password manager or secure vault

# Clean up plaintext
shred -u env-backup.txt
```

**Recovery Procedure:**

```bash
# Decrypt and restore
gpg --decrypt env-backup.txt.gpg > env-backup.txt

# Set in GitHub Secrets
gh secret set NETLIFY_AUTH_TOKEN < netlify-token.txt
gh secret set VITE_POSTHOG_API_KEY_PROD < posthog-key.txt
gh secret set VITE_SENTRY_DSN_PROD < sentry-dsn.txt

# Set in Netlify
netlify env:set VITE_POSTHOG_API_KEY "value" --context production

# Clean up
shred -u env-backup.txt
```

**Estimated Recovery Time:** < 1 hour

### 5. User Data Backup (Client-Side)

**Current Implementation:**
Users are responsible for backing up their own data using the export feature.

**User Guidance:**

```markdown
## Backing Up Your Notes

1. Open Paperlyte
2. Click the menu icon (⋮)
3. Select "Export Notes"
4. Choose format: JSON or Markdown
5. Save the exported file securely

**Recommended Backup Frequency:** Weekly or after important note creation
```

**Automated User Backup (Future - Q4 2025):**

```typescript
// Future cloud sync implementation
// Automatic backup to encrypted cloud storage
const backupService = {
  async autoBackup() {
    const notes = await dataService.getNotes()
    const encrypted = await encrypt(notes, userKey)
    await cloudStorage.save(encrypted)
  },

  schedule: {
    frequency: 'daily',
    time: '02:00 UTC',
  },
}
```

## Disaster Recovery Scenarios

### Scenario 1: Hosting Provider Outage (Netlify Down)

**Impact:** Production site unavailable

**Detection:**

- Uptime monitoring alert
- User reports
- Status page: https://www.netlifystatus.com

**Recovery Steps:**

```bash
# 1. Verify outage is on Netlify's end
curl -I https://paperlyte.netlify.app

# 2. Switch to Vercel backup hosting
# If Vercel is already configured as secondary:
# Update DNS to point to Vercel deployment

# 3. Emergency deployment to Vercel
npm run build
vercel --prod

# 4. Update DNS (if needed)
# Change A/CNAME records to point to Vercel

# 5. Communicate with users
# Post status update on social media
# Update status page
```

**RTO:** 15-30 minutes  
**RPO:** 0 (no data loss, static site)

### Scenario 2: GitHub Repository Compromised or Deleted

**Impact:** Cannot access source code, cannot deploy

**Detection:**

- Unable to access GitHub repository
- Git operations fail
- Team notifications

**Recovery Steps:**

```bash
# 1. Restore from local clones
# Any team member with recent clone can restore
git clone /path/to/local/paperlyte paperlyte-recovery
cd paperlyte-recovery

# 2. Create new GitHub repository
gh repo create paperlyte-recovery --public

# 3. Push all branches and tags
git remote add origin https://github.com/shazzar00ni/paperlyte-recovery.git
git push origin --all
git push origin --tags

# 4. Reconfigure CI/CD
# Update GitHub Actions secrets
# Update Netlify/Vercel GitHub integration

# 5. Resume normal operations
npm ci
npm run build
netlify deploy --prod
```

**RTO:** 1-2 hours  
**RPO:** Last git push by any team member

### Scenario 3: Total Infrastructure Loss

**Impact:** All hosting, GitHub, services unavailable

**Detection:**

- Multiple monitoring alerts
- Complete service outage
- Cannot access any systems

**Recovery Steps:**

```bash
# 1. Assess scope of damage
# Contact service providers
# Verify what systems are affected

# 2. Restore from backups
# Use most recent git clone from team member
cd ~/backups/paperlyte-latest

# 3. Rebuild infrastructure
# Create new GitHub repository
gh repo create paperlyte-new --public
git remote set-url origin https://github.com/shazzar00ni/paperlyte-new.git
git push origin main --force

# 4. Setup new hosting
# Register new Netlify site
netlify init --manual
netlify deploy --prod

# 5. Reconfigure all services
# Sentry: Create new project, get new DSN
# PostHog: Create new project, get new API key
# Update all environment variables

# 6. Update DNS if needed
# Point domain to new hosting

# 7. Communicate with users
# Send email to waitlist
# Post on social media
# Update status page
```

**RTO:** 4-8 hours  
**RPO:** Last commit pushed to GitHub (or team member's local)

### Scenario 4: Malicious Deployment

**Impact:** Production site compromised with malicious code

**Detection:**

- Security alerts
- User reports of suspicious behavior
- Sentry errors
- Code review identifies malicious commit

**Recovery Steps:**

```bash
# 1. IMMEDIATE: Take site offline
netlify deploy --dir=/path/to/empty/maintenance-page --prod

# 2. Identify malicious commit
git log --oneline -n 20
git diff [suspect-commit]~1 [suspect-commit]

# 3. Rollback to last known good version
git checkout [last-good-commit]
git tag -a v[version]-emergency-rollback -m "Emergency rollback"
git push origin v[version]-emergency-rollback

# 4. Deploy clean version
npm ci
npm run build
netlify deploy --prod

# 5. Rotate all secrets immediately
# Change all API keys, tokens, passwords
# Update GitHub secrets
# Update hosting platform environment variables

# 6. Security audit
# Review all commits since compromise
# Check for backdoors or persistent access
# Scan for secrets in commit history

# 7. Notify affected users
# Follow security incident disclosure procedures
# Report to relevant authorities if necessary

# 8. Post-mortem
# Document how compromise occurred
# Implement additional security measures
# Update access controls
```

**RTO:** 1-2 hours  
**RPO:** Last clean commit

### Scenario 5: DNS Hijacking

**Impact:** Domain points to wrong site or malicious content

**Detection:**

- Users report wrong site
- SSL certificate warnings
- Uptime monitoring shows wrong content

**Recovery Steps:**

```bash
# 1. Verify DNS hijacking
nslookup paperlyte.com
dig paperlyte.com

# 2. Contact domain registrar immediately
# Report unauthorized DNS changes
# Reset account credentials
# Enable 2FA if not already enabled

# 3. Restore correct DNS records
# Point to Netlify: [netlify-domain].netlify.app
# OR point to Vercel: [vercel-domain].vercel.app
# Verify A/CNAME records are correct

# 4. Monitor propagation
watch -n 10 'dig paperlyte.com'

# 5. Force SSL/TLS revalidation
# May need to reissue SSL certificates

# 6. Communicate with users
# Social media announcement
# Email notification
# Warn about potential phishing attempts
```

**RTO:** 1-4 hours (depends on DNS propagation)  
**RPO:** N/A (no data loss)

### Scenario 6: Critical Dependency Vulnerability

**Impact:** Security vulnerability in npm package

**Detection:**

- GitHub Dependabot alert
- npm audit warning
- Security researcher disclosure

**Recovery Steps:**

```bash
# 1. Assess severity
npm audit
# Review Dependabot alert details

# 2. Update vulnerable package
npm update [package-name]
# OR
npm install [package-name]@latest

# 3. Test thoroughly
npm run lint
npm run type-check
npm run test:run
npm run build

# 4. Deploy fix immediately if critical
git commit -am "security: update vulnerable dependency [package-name]"
git tag -a v[version]-security-patch -m "Security patch"
git push origin v[version]-security-patch

# 5. Monitor for issues
# Watch Sentry for new errors
# Check analytics for user impact

# 6. Document and communicate
# Update SECURITY.md
# Notify users if necessary (for critical vulnerabilities)
```

**RTO:** 1-2 hours  
**RPO:** N/A (code change, not data)

## Recovery Testing

### Quarterly DR Drill Schedule

**Q1: Infrastructure Failover Test**

- Simulate Netlify outage
- Switch to Vercel backup
- Measure time to recovery
- Document issues encountered

**Q2: Repository Recovery Test**

- Simulate GitHub unavailability
- Restore from local clone
- Rebuild CI/CD pipelines
- Verify all functionality

**Q3: Full Disaster Recovery Test**

- Simulate total infrastructure loss
- Rebuild from scratch
- Test all recovery procedures
- Update documentation

**Q4: Security Incident Response Test**

- Simulate malicious deployment
- Practice rollback procedures
- Test secret rotation
- Review incident response

### Test Checklist

- [ ] All team members can access recovery procedures
- [ ] Recovery documentation is up to date
- [ ] Backup files are accessible and intact
- [ ] Encryption keys are available
- [ ] Contact information is current
- [ ] RTO/RPO targets are achievable
- [ ] Communication templates are ready

## Business Continuity

### Essential Services Priority

**Tier 1: Critical (Must restore first)**

1. Production website availability
2. Source code repository access
3. CI/CD pipeline functionality

**Tier 2: Important (Restore within 24 hours)**

1. Monitoring and alerting (Sentry, PostHog)
2. Development/staging environments
3. Documentation access

**Tier 3: Normal (Restore within 1 week)**

1. Historical analytics data
2. Non-critical tooling
3. Legacy documentation

### Communication Plan

**Internal Communication:**

- **Slack:** #incident channel for coordination
- **Email:** Team distribution list
- **Phone:** On-call rotation for critical incidents

**External Communication:**

- **Status Page:** https://status.paperlyte.com (recommended setup)
- **Social Media:** Twitter, LinkedIn updates
- **Email:** Waitlist subscribers notification
- **Website Banner:** User-facing incident notice

**Communication Templates:**

**Internal Incident Alert:**

```
INCIDENT ALERT - [Severity]

Status: [Detection/Assessment/Containment/Recovery]
Impact: [Description]
Start Time: [Timestamp]
Estimated Resolution: [Timeframe]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [Timeframe]
Incident Commander: [Name]
```

**External User Notification:**

```
Service Update - [Date/Time]

We are currently experiencing [brief description].
Our team is actively working on a resolution.

Impact: [What users can/cannot do]
Estimated Resolution: [Timeframe if known]

Your data is safe and secure. We will provide updates
as we work to restore full functionality.

Status Page: [URL]
Follow us: @paperlyte
```

## Preventive Measures

### 1. Regular Backups

- [ ] Weekly configuration snapshots
- [ ] Monthly encrypted secrets backup
- [ ] Quarterly infrastructure documentation review
- [ ] Continuous git commits (automatic)

### 2. Monitoring & Alerting

- [ ] Uptime monitoring configured
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring (Lighthouse CI)
- [ ] Security scanning (CodeQL, Dependabot)

### 3. Security Hardening

- [ ] 2FA enabled on all accounts
- [ ] Branch protection rules enforced
- [ ] Secrets rotation schedule (quarterly)
- [ ] Access review (monthly)

### 4. Documentation

- [ ] Recovery procedures tested
- [ ] Contact information updated
- [ ] Runbooks maintained
- [ ] Team trained on procedures

### 5. Redundancy

- [ ] Multiple hosting providers configured
- [ ] DNS provider has backup
- [ ] Team members have local clones
- [ ] Critical services have fallbacks

## Insurance & Legal

### Service Provider SLAs

**Netlify:**

- Uptime guarantee: 99.9%
- Support response time: Best effort (free tier)
- Data retention: 90 days of deploy history

**Vercel:**

- Uptime guarantee: 99.99%
- Support response time: Best effort (free tier)
- Data retention: 90 days of deployments

**GitHub:**

- Uptime guarantee: 99.95%
- Support response time: Varies by tier
- Data retention: Unlimited git history

### Legal Obligations

**GDPR Compliance:**

- Notify users within 72 hours of data breach
- Document all recovery procedures
- Maintain data processing records

**User Agreements:**

- Clearly state user data backup responsibilities
- Define service availability expectations
- Document data retention policies

## Continuous Improvement

### Post-DR Drill Actions

1. Document lessons learned
2. Update recovery procedures
3. Improve RTO/RPO if needed
4. Train team on new procedures
5. Update monitoring and alerts

### Metrics to Track

- **MTTD (Mean Time To Detect):** Target < 5 minutes
- **MTTR (Mean Time To Recover):** Target < 1 hour
- **Recovery Success Rate:** Target 100%
- **Drill Completion Rate:** Target 4 per year

### Annual Review

- Reassess RTO/RPO targets
- Update contact information
- Review and test all procedures
- Evaluate new backup technologies
- Update disaster scenarios

---

**Next Actions:**

1. Set up automated configuration backups
2. Create mirror repository (GitLab/Bitbucket)
3. Document all critical passwords/keys in vault
4. Schedule first DR drill
5. Configure uptime monitoring

**Emergency Contacts:**

- **On-Call Engineer:** [Phone/Email]
- **Team Lead:** [Phone/Email]
- **DevOps Lead:** [Phone/Email]

**Last Reviewed:** 2025-11-02  
**Next Review:** 2026-02-02 (Quarterly)
