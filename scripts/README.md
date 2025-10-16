# Performance Audit Scripts

This directory contains cross-platform scripts for running performance audits on the Paperlyte application.

## Scripts

### `performance-audit.js`

A comprehensive Node.js script that handles the complete performance audit workflow:

1. **Build**: Compiles the application for production
2. **Server Management**: Starts the preview server programmatically
3. **Health Checks**: Waits for server readiness with proper timeout handling
4. **Lighthouse Execution**: Runs Lighthouse CI with environment configuration
5. **Cleanup**: Gracefully shuts down all processes

#### Features

- **Cross-platform**: Works on Windows, macOS, and Linux
- **Robust Health Checks**: Waits for actual server readiness instead of arbitrary delays
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals for clean process termination
- **Error Handling**: Comprehensive error reporting and cleanup on failures
- **Timeout Protection**: Prevents hanging on server startup issues

#### Usage

```bash
# Primary method (uses Node.js script)
npm run performance:audit

# Alternative method (uses npm-run-all)
npm run performance:audit:simple
```

#### Environment Variables

- `LHCI_BUILD_CONTEXT__CURRENT_HASH`: Set automatically to git SHA or 'local'

#### Troubleshooting

**Port Already in Use**

```bash
# Kill any existing preview servers
pkill -f "vite preview"
# Or use a different port
VITE_PREVIEW_PORT=4174 npm run performance:audit
```

**Server Health Check Timeout**

```bash
# Check if the build was successful
npm run build
# Manually start preview to debug
npm run preview
```

**Lighthouse CI Failures**

```bash
# Run Lighthouse manually for debugging
npm run lighthouse:local
```

## Configuration

### Lighthouse CI Configuration

The script uses the existing `lighthouserc.json` configuration:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:",
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.95 }]
      }
    }
  }
}
```

### Script Configuration

The Node.js script can be configured by modifying these constants:

```javascript
const DEFAULT_PORT = 4173 // Preview server port
const DEFAULT_HOST = 'localhost' // Preview server host
const MAX_WAIT_TIME = 30000 // Maximum wait for server (ms)
const HEALTH_CHECK_INTERVAL = 1000 // Health check frequency (ms)
```

## Migration from Legacy Script

The previous script had cross-platform issues:

```bash
# Old (Unix-only)
"performance:audit": "npm run build && npm run preview & sleep 3 && npm run lighthouse:ci && pkill -f 'vite preview'"
```

Problems with the old approach:

- `&` operator doesn't work on Windows
- `sleep` command doesn't exist on Windows
- `pkill` is Unix-specific
- Fixed 3-second delay is unreliable
- No error handling or cleanup

The new implementation solves all these issues with proper cross-platform Node.js APIs.

## Development

To modify the performance audit behavior:

1. Edit `scripts/performance-audit.js`
2. Test with `node scripts/performance-audit.js`
3. Update this documentation if needed

## CI/CD Integration

The script is designed to work in CI environments:

```yaml
# GitHub Actions example
- name: Performance Audit
  run: npm run performance:audit
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

The script automatically handles:

- Environment variable propagation
- Process cleanup on CI cancellation
- Exit codes for CI success/failure reporting
