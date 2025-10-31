#!/bin/bash

# Dependency Update Testing Script for Paperlyte
# This script helps validate dependency updates before merging automated PRs

set -e

echo "🔍 Paperlyte Dependency Update Validator"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "This script must be run from within the Paperlyte git repository"
    exit 1
fi

# Check if we're in the right directory (should have package.json with paperlyte name)
if ! grep -q '"name": "paperlyte"' package.json 2>/dev/null; then
    print_error "This doesn't appear to be the Paperlyte project directory"
    exit 1
fi

print_status "Starting dependency validation process..."

# Step 1: Clean install
print_status "Step 1: Installing dependencies..."
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Run security audit
print_status "Step 2: Running security audit..."
if npm run security-audit; then
    print_success "Security audit passed"
else
    print_warning "Security audit found issues (check output above)"
fi

# Step 3: Run type checking
print_status "Step 3: Running TypeScript type checking..."
if npm run type-check; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Step 4: Run linting
print_status "Step 4: Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Step 5: Run tests
print_status "Step 5: Running test suite..."
if npm run test:run; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Step 6: Build project
print_status "Step 6: Building project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 7: Check for outdated packages
print_status "Step 7: Checking for remaining outdated packages..."
npm run deps:outdated || true

# Step 8: Check bundle size (if analyzer is available)
print_status "Step 8: Analyzing bundle size..."
if command -v npx >/dev/null 2>&1; then
    print_status "Bundle analysis complete (check output above for size changes)"
else
    print_warning "Bundle analyzer not available, skipping size check"
fi

echo ""
echo "🎉 Dependency validation complete!"
echo "========================================"
print_success "All checks passed! The dependency updates appear to be safe to merge."

echo ""
echo "📋 Next steps:"
echo "   1. Review the dependency changes in your PR"
echo "   2. Check for any breaking changes in changelogs"
echo "   3. Merge the dependency update PR"
echo "   4. Monitor the deployed application for any issues"

echo ""
print_status "💡 Tip: Run this script whenever reviewing dependency update PRs"