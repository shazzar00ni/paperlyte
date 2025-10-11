# Lighthouse CI Configuration

## Overview

This document explains the Lighthouse CI configuration used in the Paperlyte project to ensure consistent performance, accessibility, best practices, and SEO audits.

## Configuration Files

### 1. `.lighthouserc.json` (Performance Workflow)

**Used by:** `.github/workflows/performance.yml`

**Purpose:** Manual server start approach for more control

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

- No `startServerCommand` - server is started manually in the workflow
- Uses `wait-on` to ensure server readiness
- Stricter assertions (more "error" level thresholds)
- 3 runs for consistent metrics

### 2. `lighthouserc.json` (Test Workflow)

**Used by:** `.github/workflows/test.yml`

**Purpose:** Automated server start (backup configuration)

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
- More lenient assertions (more "warn" level thresholds)
- 1 run for faster CI execution

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

## Workflow Patterns

### Recommended Pattern (Used in performance.yml)

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

## Metrics and Thresholds

| Category       | `.lighthouserc.json` | `lighthouserc.json` |
| -------------- | -------------------- | ------------------- |
| Performance    | error @ 75%          | warn @ 80%          |
| Accessibility  | error @ 90%          | error @ 90%         |
| Best Practices | error @ 90%          | warn @ 80%          |
| SEO            | error @ 80%          | warn @ 80%          |
| FCP            | warn @ 2000ms        | warn @ 2000ms       |
| LCP            | warn @ 3000ms        | warn @ 2500ms       |
| CLS            | error @ 0.1          | warn @ 0.1          |
| TBT            | warn @ 300ms         | warn @ 300ms        |

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

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Vite Preview Server](https://vitejs.dev/guide/cli.html#vite-preview)
- [Lighthouse Metrics](https://web.dev/lighthouse-performance/)
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)

---

_Last Updated: October 2025_
