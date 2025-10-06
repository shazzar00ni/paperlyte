# 🛠️ Development Workflow Guide

## Overview

This guide covers the complete development workflow for Paperlyte, including CI/CD pipelines, quality gates, and development best practices.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/shazzar00ni/paperlyte.git
cd paperlyte
npm install

# Start development
npm run dev

# Run full CI locally
npm run ci
```

## 📋 Development Scripts

### Core Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Testing & Quality

- `npm run test` - Run tests in watch mode
- `npm run test:ci` - Run tests once (CI mode)
- `npm run test:coverage` - Generate coverage report
- `npm run test:ui` - Open Vitest UI

### Code Quality

- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting
- `npm run type-check` - TypeScript type checking

### Security & Dependencies

- `npm run security-audit` - Check for vulnerabilities
- `npm run security-fix` - Auto-fix security issues
- `npm run deps:check` - Check for outdated packages
- `npm run deps:update` - Update all dependencies

### Utilities

- `npm run clean` - Clean build artifacts
- `npm run analyze` - Analyze bundle size
- `npm run ci` - Run complete CI pipeline locally

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. **Continuous Integration** (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull requests
**Jobs:**

- **lint-and-format**: ESLint + Prettier validation
- **type-check**: TypeScript compilation check
- **test**: Run test suite with memory optimization
- **build**: Create production build
- **security-audit**: Vulnerability scanning

#### 2. **Deployment** (`.github/workflows/deploy.yml`)

**Triggers:** Push to `main`, Releases
**Jobs:**

- **deploy-staging**: Auto-deploy to staging on main branch
- **deploy-production**: Deploy to production on releases

#### 3. **Security Scanning** (`.github/workflows/security.yml`)

**Triggers:** Daily schedule, Push to `main`, Pull requests
**Jobs:**

- **security-audit**: npm audit + dependency review
- **codeql-analysis**: Static code analysis
- **license-check**: License compliance verification

#### 4. **Performance Monitoring** (`.github/workflows/performance.yml`)

**Triggers:** Push to `main`, Pull requests, Weekly schedule
**Jobs:**

- **lighthouse-audit**: Core Web Vitals monitoring
- **bundle-analysis**: Bundle size tracking

#### 5. **Dependency Updates** (`.github/workflows/dependencies.yml`)

**Triggers:** Weekly schedule, Manual
**Jobs:**

- **update-dependencies**: Weekly dependency updates
- **security-updates**: Automated security patches

### Quality Gates

All pull requests must pass:

- ✅ ESLint (0 warnings)
- ✅ Prettier formatting
- ✅ TypeScript compilation
- ✅ Test suite execution
- ✅ Security audit
- ✅ Successful build

## 🔀 Git Workflow

### Branch Protection Rules

**Main Branch:**

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to main

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(auth): add user authentication
fix(ui): resolve mobile navigation issue
docs: update API documentation
ci: add performance monitoring workflow
```

### Pre-commit Hooks

**Husky hooks automatically run:**

- `pre-commit`: lint-staged (ESLint + Prettier on staged files)
- `commit-msg`: commitlint (validate commit message format)
- `pre-push`: type-check + test suite

**Skip hooks (emergency only):**

```bash
git commit --no-verify -m "emergency fix"
```

## 🧪 Testing Strategy

### Test Structure

```
src/
├── components/
│   └── __tests__/
│       ├── Component.test.tsx      # Unit tests
│       └── Component.integration.test.tsx  # Integration tests
├── services/
│   └── __tests__/
│       └── service.test.ts
└── test/
    ├── setup.ts                    # Test configuration
    ├── mocks/                      # Mock implementations
    └── utils/                      # Test utilities
```

### Memory Optimization

Tests automatically run with increased memory allocation (4GB):

```bash
# Built into all test scripts
npm run test        # Already includes NODE_OPTIONS='--max-old-space-size=4096'
npm run test:run
npm run test:coverage
```

**Manual override** (if needed for larger test suites):

```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run test
```

### Test Configuration Features

- **Single Fork Mode**: Reduces memory usage by running tests sequentially
- **Test Isolation**: Each test runs in isolation to prevent memory leaks
- **Automatic Cleanup**: localStorage, React components, and mocks cleaned after each test
- **Optimized Timeouts**: 10-second timeouts for tests, hooks, and teardown

### Coverage Requirements

- **Minimum Coverage:** 80%
- **Critical Paths:** 90%
- **New Features:** Must include tests

## 📊 Performance Monitoring

### Lighthouse CI

Automated performance audits on every PR:

- **Performance:** >75 (target: >90)
- **Accessibility:** >90
- **Best Practices:** >90
- **SEO:** >80

### Bundle Size Monitoring

- **JavaScript bundles:** <500KB warning threshold
- **Total bundle size:** Tracked and reported
- **Bundle analysis:** Available via `npm run analyze`

## 🔐 Security

### Automated Security Measures

1. **Dependency Scanning:** Daily npm audit
2. **CodeQL Analysis:** Static code analysis
3. **License Compliance:** Automated license checking
4. **Security Updates:** Automatic PR creation for vulnerabilities

### Security Best Practices

- Use `npm ci` in production
- Regular dependency updates
- Security-first code reviews
- Environment variable validation

## 🚀 Deployment

### Environments

1. **Development:** Local development server
2. **Staging:** Automatic deployment from `main` branch
3. **Production:** Manual deployment via GitHub releases

### Environment Variables

**Required for deployment:**

```bash
VITE_POSTHOG_API_KEY=your_posthog_key
VITE_SENTRY_DSN=your_sentry_dsn
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

### Deployment Process

1. **Create Release:** Tag version and create GitHub release
2. **Automated Build:** CI builds production bundle
3. **Deploy:** Netlify deployment with environment variables
4. **Verify:** Automated health checks and monitoring

## 🛠️ Development Environment

### VS Code Configuration

**Auto-configured features:**

- Format on save (Prettier)
- ESLint auto-fix on save
- Import organization
- TypeScript IntelliSense
- Tailwind CSS IntelliSense

**Recommended Extensions:**

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- Error Lens
- Vitest Explorer

### IDE Settings

Settings are automatically configured in `.vscode/settings.json` for:

- Consistent code formatting
- TypeScript preferences
- File exclusions for better performance
- Tailwind CSS support

## 🐛 Troubleshooting

### Common Issues

**Test Memory Errors:**

Tests now automatically include memory optimization. If you still encounter issues:

```bash
# Increase Node.js memory limit further (8GB)
export NODE_OPTIONS="--max-old-space-size=8192"
npm run test

# Or run tests individually
npm run test:run -- path/to/specific.test.ts
```

**Check current memory limit:**

```bash
node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024 + ' MB')"
```

**Build Failures:**

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Hook Failures:**

```bash
# Reset Husky hooks
npm run prepare
```

**Dependency Issues:**

```bash
# Check for updates
npm run deps:check

# Update dependencies
npm run deps:update
```

### VS Code Extension Issues

**Vitest Extension Error:** When working with remote repositories, the Vitest extension may show path resolution errors.

**Solution:** Use terminal commands instead:

```bash
npm run test      # Watch mode
npm run test:ci   # Single run
npm run test:ui   # Browser UI
```

See [docs/vscode-troubleshooting.md](./vscode-troubleshooting.md) for detailed solutions.

### Getting Help

1. Check existing GitHub issues
2. Review workflow logs in Actions tab
3. Run `npm run ci` locally to replicate CI environment
4. Check VS Code troubleshooting guide for extension issues
5. Contact team via GitHub discussions

## 📈 Metrics & Monitoring

### Development Metrics

- **CI Pipeline Success Rate:** Target >95%
- **Average PR Review Time:** <24 hours
- **Test Coverage:** >80%
- **Build Time:** <5 minutes

### Performance Metrics

- **Lighthouse Performance Score:** Target >90
- **Bundle Size:** Monitor and optimize
- **Core Web Vitals:** Meet Google standards

---

## 🎯 Next Steps

1. **Review this workflow** and customize for team needs
2. **Set up environment variables** for deployments
3. **Configure branch protection rules** in GitHub
4. **Train team members** on the workflow
5. **Monitor and iterate** on the process

**Happy coding! 🚀**
