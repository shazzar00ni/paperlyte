# 🛠️ VS Code Extensions Troubleshooting

## Vitest Extension Issues

### Problem: "Cannot find module '/shazzar00ni/paperlyte/package.json'"

This error occurs when working with remote repositories via VS Code's GitHub integration. The Vitest extension expects a local filesystem path but receives a VFS URI.

### Solutions

#### Option 1: Disable Vitest Extension (Recommended for Remote Work)

```json
// In .vscode/settings.json
{
  "vitest.enable": false,
  "testing.automaticallyOpenPeekView": "never",
  "testing.openTesting": "neverOpen"
}
```

#### Option 2: Use Terminal for Testing

Instead of the VS Code extension, run tests via terminal:

```bash
# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:ci

# Run tests with coverage
npm run test:coverage

# Open Vitest UI in browser
npm run test:ui
```

#### Option 3: Clone Locally for Full Extension Support

For the best development experience with all extensions:

```bash
# Clone repository locally
git clone https://github.com/shazzar00ni/paperlyte.git
cd paperlyte
npm install
npm run dev
```

### VS Code Extension Compatibility

#### ✅ Working Extensions (Remote Compatible)

- **ESLint** - Code linting ✓
- **Prettier** - Code formatting ✓
- **Tailwind CSS** - Utility classes ✓
- **TypeScript** - Language support ✓
- **Error Lens** - Inline errors ✓
- **GitHub Copilot** - AI assistance ✓

#### ⚠️ Limited Extensions (Local Filesystem Required)

- **Vitest Explorer** - Test discovery issues
- Some file watchers and local tools

### Recommended Workflow

#### For Remote Development:

1. **Use terminal for testing**: `npm run test`
2. **Use browser for Vitest UI**: `npm run test:ui`
3. **Rely on CI/CD for comprehensive testing**
4. **Use ESLint + Prettier extensions for code quality**

#### For Local Development:

1. **Clone repository locally**
2. **Full extension support available**
3. **Native filesystem integration**
4. **Better performance and tool compatibility**

### Configuration Applied

We've configured the workspace to minimize extension conflicts:

```json
// .vscode/settings.json - Updated configuration
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test",
  "vitest.rootConfig": "./vite.config.ts",
  "testing.automaticallyOpenPeekView": "never",
  "testing.openTesting": "neverOpen"
}
```

### Alternative Testing Approaches

#### 1. Terminal-Based Testing

```bash
# Watch mode with hot reload
npm run test

# Single run with results
npm run test:ci

# Coverage analysis
npm run test:coverage
```

#### 2. Browser-Based UI

```bash
# Start Vitest UI server
npm run test:ui
# Opens http://localhost:51204/__vitest__/
```

#### 3. CI/CD Integration

- GitHub Actions runs all tests automatically
- Pull requests include test results
- No local setup required for basic development

### Quick Fix Summary

The error is resolved by updating VS Code settings to better handle remote development scenarios. While the Vitest extension may have limited functionality in remote mode, all testing capabilities remain available via terminal commands.

**Immediate Action**: Use `npm run test` in terminal for testing instead of relying on the VS Code extension.
