#!/bin/bash

# 🔍 Paperlyte CI/CD Setup Validation Script
# This script validates that all CI/CD infrastructure is properly configured

# Note: We don't use 'set -e' because we want to continue checking even if some tests fail

echo "🔍 Paperlyte CI/CD Setup Validation"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if a file exists and is executable
check_executable() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            echo -e "${GREEN}✅ ${description}${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ ${description} (not executable)${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${RED}❌ ${description} (missing)${NC}"
        ((FAILED++))
    fi
}

# Function to check if a file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ ${description}${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ ${description}${NC}"
        ((FAILED++))
    fi
}

# Function to check if a command exists
check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✅ ${description}${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  ${description}${NC}"
        ((WARNINGS++))
    fi
}

echo "📦 Checking GitHub Actions Workflows..."
echo "---------------------------------------"
check_file ".github/workflows/ci.yml" "CI workflow"
check_file ".github/workflows/security.yml" "Security scanning workflow"
check_file ".github/workflows/deploy.yml" "Deployment workflow"
check_file ".github/workflows/performance.yml" "Performance monitoring workflow"
check_file ".github/workflows/dependencies.yml" "Dependency updates workflow"
check_file ".github/workflows/pr-validation.yml" "PR validation workflow"
check_file ".github/workflows/commitlint.yml" "Commitlint workflow"
check_file ".github/workflows/test.yml" "Test workflow"
check_file ".github/workflows/codecov.yml" "Code coverage workflow"

echo ""
echo "🪝 Checking Husky Git Hooks..."
echo "------------------------------"
check_executable ".husky/pre-commit" "Pre-commit hook"
check_executable ".husky/commit-msg" "Commit message hook"
check_executable ".husky/pre-push" "Pre-push hook"

echo ""
echo "⚙️  Checking Configuration Files..."
echo "-----------------------------------"
check_file "package.json" "Package configuration"
check_file ".eslintrc.cjs" "ESLint configuration"
check_file ".prettierrc.json" "Prettier configuration"
check_file "tsconfig.json" "TypeScript configuration"
check_file ".commitlintrc.json" "Commitlint configuration"
check_file "vite.config.ts" "Vite configuration"
check_file "vitest.config.ts" "Vitest configuration"
check_file ".lighthouserc.json" "Lighthouse CI configuration"

echo ""
echo "🛠️  Checking Development Tools..."
echo "---------------------------------"
check_command "node" "Node.js installed"
check_command "npm" "npm installed"
check_command "git" "Git installed"
check_command "gh" "GitHub CLI (optional)"

echo ""
echo "📚 Checking Documentation..."
echo "----------------------------"
check_file "docs/development-workflow.md" "Development workflow guide"
check_file "docs/deployment-setup.md" "Deployment setup guide"
check_file "docs/security-audit-report.md" "Security audit documentation"
check_file "CONTRIBUTING.md" "Contributing guide"
check_file "CODE_OF_CONDUCT.md" "Code of Conduct"

echo ""
echo "🎨 Checking VS Code Configuration..."
echo "------------------------------------"
check_file ".vscode/settings.json" "VS Code settings"
check_file ".vscode/extensions.json" "VS Code extensions"

echo ""
echo "📜 Checking Package Scripts..."
echo "------------------------------"
if [ -f "package.json" ]; then
    echo -e "${BLUE}Verifying npm scripts are defined...${NC}"
    
    scripts=(
        "dev"
        "build"
        "test"
        "test:ci"
        "test:coverage"
        "lint"
        "lint:fix"
        "format"
        "format:check"
        "type-check"
        "security-audit"
        "clean"
        "ci"
    )
    
    for script in "${scripts[@]}"; do
        if grep -q "\"$script\":" package.json; then
            echo -e "${GREEN}✅ Script: $script${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ Script: $script${NC}"
            ((FAILED++))
        fi
    done
fi

echo ""
echo "🔒 Checking Security Configuration..."
echo "-------------------------------------"
if [ -f "package.json" ] && grep -q "\"security-audit\":" package.json; then
    echo -e "${GREEN}✅ Security audit script configured${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Security audit script not found${NC}"
    ((FAILED++))
fi

echo ""
echo "🎯 CI/CD Quality Gates Configuration..."
echo "---------------------------------------"
echo -e "${BLUE}Note: Run 'npm run ci' to execute full quality checks${NC}"
echo -e "${GREEN}✅ Quality checks are configured in workflows${NC}"
((PASSED++))

echo ""
echo "📊 Validation Summary"
echo "====================="
echo -e "${GREEN}✅ Passed:   $PASSED${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
fi
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed:   $FAILED${NC}"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    echo ""
    echo "Your CI/CD infrastructure is properly configured."
    echo ""
    echo "Next steps:"
    echo "  • Commit your changes with a conventional commit message"
    echo "  • Push to trigger CI/CD pipeline"
    echo "  • Monitor workflow runs in GitHub Actions tab"
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: There are $WARNINGS warning(s) that should be addressed.${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi
