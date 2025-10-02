#!/bin/bash

# 🚀 Paperlyte Deployment Setup Script
# This script helps you configure deployment secrets and environments

set -e

echo "🚀 Paperlyte Deployment Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You're not authenticated with GitHub CLI${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is ready${NC}"

# Get repository information
REPO=$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')
echo -e "${BLUE}📂 Repository: ${REPO}${NC}"

echo ""
echo "This script will help you set up deployment secrets."
echo "You'll need accounts with:"
echo "  • Netlify (for hosting)"
echo "  • PostHog (for analytics - optional)"
echo "  • Sentry (for error monitoring - optional)"
echo ""

read -p "Continue with setup? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=${3:-false}
    
    echo ""
    echo -e "${BLUE}Setting up: ${secret_name}${NC}"
    echo "Description: ${secret_description}"
    
    if [ "$is_required" = true ]; then
        echo -e "${YELLOW}⚠️  This secret is REQUIRED for deployment${NC}"
    else
        echo -e "${GREEN}ℹ️  This secret is optional (enables additional features)${NC}"
    fi
    
    read -p "Do you want to set ${secret_name}? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Please enter the value for ${secret_name}:"
        read -s secret_value
        
        if [ -n "$secret_value" ]; then
            if gh secret set "$secret_name" --body "$secret_value"; then
                echo -e "${GREEN}✅ Secret ${secret_name} set successfully${NC}"
            else
                echo -e "${RED}❌ Failed to set secret ${secret_name}${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Empty value provided, skipping ${secret_name}${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping ${secret_name}${NC}"
    fi
}

# Required secrets for Netlify
echo ""
echo -e "${GREEN}🔐 REQUIRED SECRETS (Netlify Deployment)${NC}"
echo "========================================"

set_secret "NETLIFY_AUTH_TOKEN" "Netlify Personal Access Token (from netlify.com/account/tokens)" true
set_secret "NETLIFY_STAGING_SITE_ID" "Netlify Site ID for staging environment" true  
set_secret "NETLIFY_PROD_SITE_ID" "Netlify Site ID for production environment" true

# Optional secrets for analytics and monitoring
echo ""
echo -e "${BLUE}📊 OPTIONAL SECRETS (Analytics & Monitoring)${NC}"
echo "============================================="

set_secret "VITE_POSTHOG_API_KEY_STAGING" "PostHog API Key for staging analytics"
set_secret "VITE_POSTHOG_API_KEY_PROD" "PostHog API Key for production analytics"
set_secret "VITE_SENTRY_DSN_STAGING" "Sentry DSN for staging error monitoring"
set_secret "VITE_SENTRY_DSN_PROD" "Sentry DSN for production error monitoring"

# Summary
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="

echo ""
echo "Next steps:"
echo "1. Create Netlify sites for staging and production"
echo "2. Update the site IDs in your GitHub secrets if needed"
echo "3. Push to main branch to trigger staging deployment"
echo "4. Create a GitHub release to trigger production deployment"

echo ""
echo "Useful commands:"
echo "  • View secrets: gh secret list"
echo "  • Update secret: gh secret set SECRET_NAME"
echo "  • Delete secret: gh secret delete SECRET_NAME"

echo ""
echo -e "${BLUE}📚 For detailed setup instructions, see: docs/deployment-setup.md${NC}"

echo ""
echo -e "${GREEN}✨ Happy deploying!${NC}"