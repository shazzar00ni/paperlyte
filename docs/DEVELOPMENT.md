# Development Guide

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git

### Installation

```bash
git clone https://github.com/shazzar00ni/paperlyte.git
cd paperlyte
npm install
```

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run type-check

# Security audit
npm run security-audit
npm run security-fix
```

## Development Workflow

### Code Quality

- **ESLint**: Configured for TypeScript and React
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict type checking enabled
- **Husky**: Git hooks for pre-commit validation

### Git Hooks

Pre-commit hooks automatically run:

- ESLint (with auto-fix)
- Prettier formatting
- TypeScript type checking

Commit message validation ensures [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add new feature
fix: resolve bug issue
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: maintenance tasks
```

### Project Structure

```
paperlyte/
├── src/                     # Application source code
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── assets/             # Static assets
│   ├── styles/             # CSS files
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/                 # Public static files
├── dist/                   # Production build output
├── .github/                # GitHub templates and workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── workflows/          # CI/CD workflows
├── docs/                   # Documentation
└── simple-scribbles/       # Current documentation
```

## CI/CD Pipeline

GitHub Actions automatically run on push and PR:

- **Linting**: ESLint code quality checks
- **Formatting**: Prettier code style validation
- **Type Checking**: TypeScript compilation validation
- **Build**: Production build verification
- **Security Audit**: Dependency vulnerability scanning
- **Commit Message Linting**: Conventional Commits validation

## Dependency Management

Paperlyte uses automated dependency updates to maintain security and keep packages current:

### Automated Updates

- **Dependabot**: Configured in `.github/dependabot.yml` for weekly updates
- **Security Updates**: Automatic security patches via GitHub Actions
- **Grouped Updates**: Related packages updated together to reduce PR noise

### Manual Dependency Commands

```bash
# Check for outdated packages
npm run deps:outdated

# Check for dependency updates
npm run deps:check

# Update dependencies manually
npm run deps:update

# Run security audit
npm run deps:audit

# Validate dependency updates
npm run deps:test-updates

# Full validation pipeline
npm run deps:validate
```

### Reviewing Dependency PRs

When Dependabot creates dependency update PRs:

1. **Automated Checks**: CI pipeline runs automatically
2. **Manual Validation**: Run `npm run deps:test-updates` locally
3. **Review Changes**: Check changelogs for breaking changes
4. **Merge Strategy**:
   - Security updates: Merge immediately after basic testing
   - Minor updates: Merge weekly during maintenance window
   - Major updates: Review carefully and test thoroughly

📖 **Full Documentation**: See [dependency-automation.md](dependency-automation.md) for complete setup details.

## Environment Setup

### VS Code (Recommended)

Install these extensions:

- ESLint
- Prettier - Code formatter
- TypeScript Importer
- Auto Rename Tag
- Bracket Pair Colorizer

### Development Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Open in browser at http://localhost:3000
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes following our coding standards
3. Commit with conventional commit format
4. Push and create a PR
5. Wait for CI checks to pass

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Troubleshooting

### Common Issues

**ESLint errors**: Run `npm run lint:fix` to auto-fix issues

**TypeScript errors**: Check `npm run type-check` output

**Build failures**: Ensure all dependencies are installed with `npm install`

**Git hooks failing**: Make sure Husky is properly installed with `npm run prepare`

### Getting Help

- Check existing issues in GitHub
- Review documentation in `/docs` and `/simple-scribbles`
- Open a new issue with the bug report template
- Email: hello@paperlyte.com
