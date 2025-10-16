# Lighthouse CI Configuration

## Overview

This document explains the Lighthouse CI configuration used in the Paperlyte project to ensure consistent performance, accessibility, best practices, and SEO audits.

## Configuration Files

### 1. `.lighthouserc.json` (PR Validation)

**Used by:** `.github/workflows/test.yml` (performance-tests job)

**Purpose:** Lenient thresholds for pull request validation

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox --headless --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --disable-extensions",
        "maxWaitForLoad": 90000,
        "skipAudits": null
      }
    },
    ...
  }
}
```

**Key Features:**

- Performance checks set to **warn** level (minScore: 0.7)
- More lenient thresholds to avoid blocking PRs for minor performance variations
- Uses `wait-on` to ensure server readiness
- 3 runs for consistent metrics
- Appropriate for catching major regressions without false positives

**Thresholds:**

- Performance: warn @ 70%
- Accessibility: error @ 90%
- Best Practices: warn @ 85%
- SEO: warn @ 80%
- FCP: warn @ 2500ms
- LCP: warn @ 3500ms
- CLS: warn @ 0.1
- TBT: warn @ 400ms

### 2. `.lighthouserc.strict.json` (Performance Monitoring)

**Used by:** `.github/workflows/performance.yml` (lighthouse-audit job)

**Purpose:** Strict thresholds for dedicated performance monitoring

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3,
      ...
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        ...
      }
    }
  }
}
```

**Key Features:**

- Stricter assertions with **error** level thresholds
- Used for scheduled weekly performance audits
- Used for post-merge performance monitoring on main branch
- 3 runs for highly consistent metrics
- Helps maintain production performance standards

**Thresholds:**

- Performance: error @ 80%
- Accessibility: error @ 95%
- Best Practices: error @ 90%
- SEO: error @ 85%
- FCP: error @ 1800ms
- LCP: error @ 2500ms
- CLS: error @ 0.1
- TBT: error @ 300ms
- Speed Index: warn @ 3000ms
- Time to Interactive: warn @ 3500ms

### 3. `lighthouserc.json` (Alternative Configuration)

**Used by:** Can be used for local development testing

**Purpose:** Automated server start with balanced thresholds

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:",
      "numberOfRuns": 1,
      ...
    },
    ...
  }
}
```

**Key Features:**

- Includes `startServerCommand` for automated workflows
- Balanced assertions suitable for local testing
- 1 run for faster execution
- Good for quick local performance checks

## Common Issues and Solutions

### Issue: NO_FCP Error (No First Contentful Paint)

**Symptoms:**

```
Runtime error encountered: The page did not paint any content.
Please ensure you keep the browser window in the foreground during
the load and try again. (NO_FCP)
```

**Root Causes:**

1. Wrong port configuration (3000 vs 4173)
2. Server not fully started before Lighthouse runs
3. Missing Chrome flags for CI environment
4. External service timeouts (PostHog, Sentry)

**Solutions:**

1. ✅ Use correct preview port: `http://localhost:4173`
2. ✅ Add `wait-on` step before running Lighthouse
3. ✅ Use comprehensive Chrome flags:
   ```
   --no-sandbox --headless --disable-gpu --disable-dev-shm-usage
   --disable-software-rasterizer --disable-extensions
   --disable-setuid-sandbox --allow-insecure-localhost
   ```
4. ✅ Set appropriate timeout: `maxWaitForLoad: 90000` (90 seconds)

### Issue: Wrong Port Configuration

**Problem:** Using development server port (3000) instead of preview port (4173)

**Fix:**

- Development server (`npm run dev`): Port 3000
- Preview server (`npm run preview`): Port 4173
- **Always use 4173 for Lighthouse audits**

## Workflow Usage

### Performance Workflow (`.github/workflows/performance.yml`)

**Uses:** `.lighthouserc.strict.json`

**Triggers:**

- Push to main branch (post-merge monitoring)
- Weekly schedule (Sundays at 3 AM UTC)
- Manual workflow dispatch

**Purpose:** Ensure production performance standards are maintained over time

### Test Workflow (`.github/workflows/test.yml`)

**Uses:** `.lighthouserc.json`

**Triggers:**

- Pull requests to main/develop branches
- Push to main/develop branches

**Purpose:** Validate that PRs don't introduce major performance regressions without blocking development

## Workflow Patterns

### Recommended Pattern (Used in performance.yml and test.yml)

```yaml
- name: Build application
  run: npm run build

- name: Start preview server
  run: npm run preview &

- name: Wait for server to start
  run: npx wait-on http://localhost:4173 --timeout 60000

- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    configPath: './.lighthouserc.json'
    uploadArtifacts: true
    temporaryPublicStorage: true
```

**Why this pattern works:**

1. Explicit server start gives better control
2. `wait-on` ensures server is fully ready
3. Server runs in background (`&`) allowing next steps to execute
4. Lighthouse action version v10 has better stability

### Alternative Pattern (Automated)

If you must use `startServerCommand` in the config:

- Ensure `startServerReadyPattern` matches server output
- Use generous timeouts
- Consider fewer runs (1 instead of 3)

## Chrome Flags Explained

| Flag                             | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `--no-sandbox`                   | Required for CI environments without sandboxing     |
| `--headless` or `--headless=new` | Run Chrome without UI                               |
| `--disable-gpu`                  | Disable GPU hardware acceleration                   |
| `--disable-dev-shm-usage`        | Use /tmp instead of /dev/shm to avoid memory issues |
| `--disable-software-rasterizer`  | Disable software rasterizer                         |
| `--disable-extensions`           | Disable Chrome extensions                           |
| `--disable-setuid-sandbox`       | Additional sandbox disabling for CI                 |
| `--allow-insecure-localhost`     | Allow insecure connections to localhost             |

## Vite Configuration

The `vite.config.ts` includes preview server configuration:

```typescript
preview: {
  port: 4173,
  headers: {
    'Content-Security-Policy': "...",
  },
}
```

This ensures:

- Consistent port usage
- Proper CSP headers for preview builds
- Same security policies as production

## Testing Locally

To test Lighthouse CI locally:

```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli

# Build the application
npm run build

# Start preview server (in background)
npm run preview &

# Wait for server
npx wait-on http://localhost:4173

# Run Lighthouse CI
lhci collect --config=./.lighthouserc.json
```

## Metrics and Thresholds Comparison

| Category       | `.lighthouserc.json` (PR Validation) | `.lighthouserc.strict.json` (Monitoring) | `lighthouserc.json` (Local) |
| -------------- | ------------------------------------ | ---------------------------------------- | --------------------------- |
| Performance    | warn @ 70%                           | error @ 80%                              | warn @ 80%                  |
| Accessibility  | error @ 90%                          | error @ 95%                              | error @ 90%                 |
| Best Practices | warn @ 85%                           | error @ 90%                              | warn @ 80%                  |
| SEO            | warn @ 80%                           | error @ 85%                              | warn @ 80%                  |
| FCP            | warn @ 2500ms                        | error @ 1800ms                           | warn @ 2000ms               |
| LCP            | warn @ 3500ms                        | error @ 2500ms                           | warn @ 2500ms               |
| CLS            | warn @ 0.1                           | error @ 0.1                              | warn @ 0.1                  |
| TBT            | warn @ 400ms                         | error @ 300ms                            | warn @ 300ms                |
| Speed Index    | -                                    | warn @ 3000ms                            | -                           |
| Interactive    | -                                    | warn @ 3500ms                            | -                           |

### Configuration Selection Guide

**Use `.lighthouserc.json` (Standard) when:**

- Running Lighthouse in PR validation workflows
- You want to catch major performance regressions without blocking development
- Testing changes that don't directly impact performance
- Need consistent baseline metrics without strict enforcement

**Use `.lighthouserc.strict.json` (Strict) when:**

- Running scheduled performance audits (weekly/monthly)
- Monitoring production performance on the main branch
- Setting performance budgets and standards
- Need to maintain high performance bars for production

**Use `lighthouserc.json` (Alternative) when:**

- Testing locally during development
- Quick performance checks without CI overhead
- Need automated server management
- Exploring performance impact of changes

## Maintenance

### When to Update

1. **After major dependency updates** - Re-run baselines
2. **When workflows fail** - Check for Chrome version changes
3. **Performance regressions** - Investigate and adjust thresholds
4. **Lighthouse updates** - Test compatibility with new versions

### Monitoring

- GitHub Actions automatically run Lighthouse on:
  - Every push to `main` branch
  - Every pull request
  - Weekly schedule (Sundays at 3 AM UTC)

## Recent Changes

### October 2025: Configuration Separation

**Issue:** Lighthouse CI was failing on PRs unrelated to performance changes due to overly strict thresholds.

**Solution:** Separated configurations into:

- `.lighthouserc.json`: Lenient thresholds for PR validation
- `.lighthouserc.strict.json`: Strict thresholds for dedicated monitoring

**Details:** See [lighthouse-ci-fix.md](./lighthouse-ci-fix.md) for complete explanation.

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Vite Preview Server](https://vitejs.dev/guide/cli.html#vite-preview)
- [Lighthouse Metrics](https://web.dev/lighthouse-performance/)
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)
- [Configuration Fix Details](./lighthouse-ci-fix.md)

---

_Last Updated: October 16, 2025_
