# Automated Dependency Updates

Paperlyte has been configured with automated dependency management tools to keep dependencies up-to-date and secure. You have two options available:

## 🤖 Dependabot (GitHub Native - Recommended)

**File**: `.github/dependabot.yml`

### Features Configured:

- ✅ **Weekly Updates**: Every Monday at 9 AM EST
- ✅ **Grouped Updates**: Related packages are grouped together to reduce PR noise
- ✅ **Security Updates**: Automatic security vulnerability patches
- ✅ **GitHub Actions Updates**: Keeps CI/CD workflows up-to-date
- ✅ **Smart Grouping**: React, testing, dev tools, and build tools are grouped separately
- ✅ **Major Version Protection**: Major updates are ignored for critical dependencies

### Dependency Groups:

- **React Updates**: `react`, `react-dom`, `@types/react*`
- **Testing Updates**: `vitest`, `@testing-library/*`, `@playwright/test`
- **Dev Tooling**: ESLint, Prettier, TypeScript, linting tools
- **Build Tools**: Vite, PostCSS, Autoprefixer
- **Styling**: Tailwind CSS and related packages

### PR Management:

- **Max Open PRs**: 5 for npm, 3 for GitHub Actions
- **Auto-assigned**: @shazzar00ni
- **Labels**: `dependencies`, `automated-pr`
- **Commit Format**: `chore(deps): update package to version`

## 🔧 Renovate (Alternative Option)

**File**: `renovate.json`

### Features Configured:

- ✅ **Dependency Dashboard**: Interactive issue for managing updates
- ✅ **Auto-merge**: Patch updates for non-critical packages
- ✅ **Stability Days**: 3-day waiting period for new releases
- ✅ **Security Alerts**: Immediate processing of vulnerability fixes
- ✅ **Smart Scheduling**: Monday mornings with rate limiting
- ✅ **Version Pinning**: GitHub Actions pinned to exact SHAs for security

### Advanced Features:

- **OSV Vulnerability Alerts**: Enhanced security scanning
- **Lock File Maintenance**: Weekly package-lock.json updates
- **Semantic Commits**: Conventional commit format
- **Release Notes**: Automatic changelog integration
- **Flexible Configuration**: More granular control options

## 🚀 Getting Started

### Option 1: Use Dependabot (Recommended for GitHub)

1. **Activate**: Dependabot is automatically enabled when you push the `.github/dependabot.yml` file
2. **First Run**: Will scan within 24 hours and create initial PRs
3. **Management**: View and manage PRs in the "Pull requests" tab
4. **Settings**: Configure in Repository Settings → Code security → Dependabot

### Option 2: Use Renovate

1. **Install**: Visit [Renovate GitHub App](https://github.com/apps/renovate) and install
2. **Activate**: Grant repository access to the Renovate app
3. **Configuration**: The `renovate.json` file will be automatically detected
4. **Dashboard**: Check the "Dependency Dashboard" issue for overview

### Choosing Between Them

| Feature                   | Dependabot  | Renovate              |
| ------------------------- | ----------- | --------------------- |
| **Setup Complexity**      | Simple      | Moderate              |
| **GitHub Integration**    | Native      | Third-party app       |
| **Configuration Options** | Basic       | Advanced              |
| **Auto-merge**            | Manual only | Configurable          |
| **Dependency Dashboard**  | ❌          | ✅                    |
| **Lock File Updates**     | ❌          | ✅                    |
| **Release Notes**         | Basic       | Advanced              |
| **Cost**                  | Free        | Free for public repos |

## 📋 Management Tasks

### Weekly Review Process:

1. **Check PRs**: Review dependency update PRs every Monday
2. **Test Critical Updates**: Run `npm run ci` for major updates
3. **Security Updates**: Merge security patches immediately
4. **Release Planning**: Schedule major updates with releases

### Monitoring Commands:

```bash
# Check for security vulnerabilities
npm run security-audit

# Manual dependency check
npm run deps:check

# Manual dependency update
npm run deps:update

# Run full CI pipeline
npm run ci
```

### Emergency Procedures:

#### Disable Automated Updates Temporarily:

- **Dependabot**: Add packages to the `ignore` section in `.github/dependabot.yml`
- **Renovate**: Create a new issue with title "Pin dependencies" and list packages

#### Handle Failed Updates:

1. Check the PR for breaking changes
2. Review changelog and migration guides
3. Test locally: `npm install package@version`
4. Update code if needed
5. Merge when tests pass

#### Security Alert Response:

1. **Critical**: Merge security PRs immediately after basic testing
2. **High**: Review and merge within 24 hours
3. **Medium/Low**: Include in next regular update cycle

## 🔧 Configuration Customization

### Common Adjustments:

#### Change Update Schedule:

```yaml
# In dependabot.yml
schedule:
  interval: 'daily' # daily, weekly, monthly
  day: 'wednesday' # for weekly updates
  time: '14:00' # 24-hour format
```

#### Modify PR Limits:

```yaml
# In dependabot.yml
open-pull-requests-limit: 10 # Increase if you want more concurrent PRs
```

#### Add New Package Groups:

```yaml
# In dependabot.yml
groups:
  utility-updates:
    patterns:
      - 'lodash*'
      - 'date-fns'
```

### Advanced Renovate Options:

```json
// In renovate.json
{
  "automerge": true, // Enable auto-merge for patches
  "platformAutomerge": true, // Use GitHub's auto-merge feature
  "schedule": ["before 6am"], // Change timing
  "prConcurrentLimit": 10 // More concurrent PRs
}
```

## 📊 Monitoring and Analytics

Both tools provide insights through:

- **PR History**: Track update patterns and success rates
- **Security Alerts**: Monitor vulnerability response times
- **Dependency Insights**: GitHub's dependency graph and security advisories
- **CI Integration**: Both work with existing GitHub Actions workflows

## 🛠️ Troubleshooting

### Common Issues:

#### PRs Not Created:

1. Check repository permissions
2. Verify configuration file syntax
3. Look for rate limiting messages
4. Check if packages are already up-to-date

#### Failed Dependency Updates:

1. Review breaking changes in package changelogs
2. Check TypeScript compatibility
3. Run tests locally before merging
4. Consider pinning to previous stable version

#### Too Many PRs:

1. Reduce `open-pull-requests-limit`
2. Add more aggressive grouping rules
3. Increase `stabilityDays` for non-critical packages
4. Use auto-merge for patch updates

### Getting Help:

- **Dependabot**: [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- **Renovate**: [Renovate Documentation](https://docs.renovatebot.com/)
- **Paperlyte Issues**: Create an issue in this repository for project-specific problems

---

**Recommendation**: Start with **Dependabot** as it's simpler and native to GitHub. You can always switch to Renovate later if you need more advanced features like auto-merge or the dependency dashboard.
