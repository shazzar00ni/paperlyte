# Contributing to Paperlyte

Thank you for your interest in contributing to Paperlyte! We welcome all contributions to make Paperlyte better.

## How to Contribute

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/paperlyte.git
   cd paperlyte
   ```
3. **Install dependencies:**
   ```bash
   npm ci
   ```
4. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```
5. **Make your changes and test locally:**
   ```bash
   npm run ci  # Run linting, type-check, tests, and build
   ```
6. **Commit your changes:**
   ```bash
   git commit -m "feat: add your feature"
   ```
   _Note: Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format_
7. **Push to your fork:**
   ```bash
   git push origin feature/your-feature
   ```
8. **Open a Pull Request**

## Development Workflow

### Local Development

```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test

# Run specific test suites
npm run test:e2e        # E2E tests
npm run test:coverage   # With coverage report
npm run test:ui         # Open Vitest UI
```

### Code Quality

Before committing, ensure your code passes all quality checks:

```bash
# Run all quality checks (what CI runs)
npm run ci

# Or run checks individually:
npm run lint           # ESLint
npm run type-check     # TypeScript
npm run format:check   # Prettier
npm run security-audit # npm audit
npm run build          # Production build
```

### Pre-commit Hooks

We use [Husky](https://typicode.github.io/husky/) for Git hooks:

- **pre-commit**: Runs `lint-staged` (ESLint + Prettier on staged files)
- **commit-msg**: Validates commit message format
- **pre-push**: Runs type-check and tests

### CI/CD Pipeline

All pull requests automatically trigger:

✅ **Code Quality Checks**

- ESLint (0 warnings policy)
- Prettier formatting
- TypeScript type checking

✅ **Testing**

- Unit tests
- Integration tests
- E2E tests (Playwright)
- Code coverage reporting

✅ **Security**

- npm audit
- CodeQL analysis
- Dependency review

✅ **Performance**

- Lighthouse CI audits
- Bundle size monitoring

✅ **Build Verification**

- Production build

### Validation Script

Before submitting a PR, you can validate your setup:

```bash
./scripts/validate-ci-setup.sh
```

This checks:

- GitHub Actions workflows
- Git hooks configuration
- Development tools
- Package scripts
- Documentation

## Code Style

- Use [Prettier](https://prettier.io/) for formatting (automatic via pre-commit hook)
- Use TypeScript for all code
- Use functional React components and hooks
- Name UI components in PascalCase
- Follow existing patterns in the codebase

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes that don't modify src or test files

**Examples:**

```bash
git commit -m "feat: add dark mode toggle"
git commit -m "fix: resolve memory leak in note editor"
git commit -m "docs: update API documentation"
git commit -m "test: add tests for sync engine"
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code passes all CI checks (`npm run ci`)
- [ ] Tests added/updated for new features or bug fixes
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits format
- [ ] Branch is up-to-date with main

### PR Description

Please include:

- **What**: Clear description of changes
- **Why**: Motivation and context
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes

### Review Process

1. Automated CI/CD checks must pass
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Development Environment

### Recommended VS Code Extensions

Our `.vscode/extensions.json` includes:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript
- Error Lens
- Vitest Explorer

### Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

See `docs/deployment-setup.md` for details on required secrets.

## Issues

- Use issue templates for [bug reports](.github/ISSUE_TEMPLATE/bug_report.md) and [feature requests](.github/ISSUE_TEMPLATE/feature_request.md)
- Search existing issues before creating new ones
- Provide detailed reproduction steps for bugs
- Include screenshots/videos for UI issues

## Documentation

Key documentation files:

- `docs/development-workflow.md` - Complete development guide
- `docs/deployment-setup.md` - Deployment configuration
- `docs/TESTING.md` - Testing strategies
- `docs/security-audit-report.md` - Security guidelines

## Code of Conduct

Please read and follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Need Help?

- 📝 Create an issue for bugs or features
- 💬 Start a discussion for questions
- 📧 Email us at hello@paperlyte.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Paperlyte! 🎉
