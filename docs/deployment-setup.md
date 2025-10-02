# 🚀 Deployment Setup Guide

## Required GitHub Secrets

To enable automated deployments, you need to configure the following secrets in your GitHub repository:

### Accessing GitHub Secrets
1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

## Required Secrets

### 🔐 Netlify Configuration
```
NETLIFY_AUTH_TOKEN
Description: Your Netlify personal access token
How to get: Netlify Dashboard → User Settings → Applications → Personal Access Tokens

NETLIFY_STAGING_SITE_ID
Description: Site ID for staging environment
How to get: Netlify Dashboard → Your Staging Site → Site Settings → General → Site Details

NETLIFY_PROD_SITE_ID  
Description: Site ID for production environment
How to get: Netlify Dashboard → Your Production Site → Site Settings → General → Site Details
```

### 📊 Analytics & Monitoring (Staging)
```
VITE_POSTHOG_API_KEY_STAGING
Description: PostHog API key for staging environment
How to get: PostHog Dashboard → Project Settings → API Keys

VITE_SENTRY_DSN_STAGING
Description: Sentry DSN for staging error monitoring
How to get: Sentry Dashboard → Project Settings → Client Keys (DSN)
```

### 📈 Analytics & Monitoring (Production)
```
VITE_POSTHOG_API_KEY_PROD
Description: PostHog API key for production environment
How to get: PostHog Dashboard → Project Settings → API Keys

VITE_SENTRY_DSN_PROD
Description: Sentry DSN for production error monitoring  
How to get: Sentry Dashboard → Project Settings → Client Keys (DSN)
```

## Setup Instructions

### 1. Netlify Setup

#### Create Netlify Sites
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Create staging site
netlify sites:create --name paperlyte-staging

# Create production site  
netlify sites:create --name paperlyte-prod
```

#### Get Site IDs
```bash
# List your sites to get Site IDs
netlify sites:list
```

#### Generate Personal Access Token
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click your avatar → **User settings**
3. Go to **Applications** → **Personal access tokens**
4. Click **New access token**
5. Copy the token (save it immediately - it won't be shown again)

### 2. PostHog Setup

#### Create PostHog Projects
1. Go to [PostHog](https://app.posthog.com/)
2. Create separate projects for staging and production
3. Get API keys from **Project Settings** → **Project API Key**

#### Environment-Specific Configuration
- **Staging**: Use for development and testing data
- **Production**: Use for real user analytics data

### 3. Sentry Setup

#### Create Sentry Projects
1. Go to [Sentry](https://sentry.io/)
2. Create separate projects for staging and production
3. Get DSN from **Settings** → **Projects** → **[Project Name]** → **Client Keys**

#### Environment Configuration
- **Staging**: Lower error thresholds, more verbose logging
- **Production**: Critical errors only, user-focused reporting

## Environment Variables Summary

### Required for Deployment
| Secret Name | Environment | Service | Required |
|-------------|------------|---------|----------|
| `NETLIFY_AUTH_TOKEN` | Both | Netlify | ✅ Required |
| `NETLIFY_STAGING_SITE_ID` | Staging | Netlify | ✅ Required |
| `NETLIFY_PROD_SITE_ID` | Production | Netlify | ✅ Required |

### Optional (Graceful Degradation)
| Secret Name | Environment | Service | Required |
|-------------|------------|---------|----------|
| `VITE_POSTHOG_API_KEY_STAGING` | Staging | PostHog | ⚠️ Optional* |
| `VITE_POSTHOG_API_KEY_PROD` | Production | PostHog | ⚠️ Optional* |
| `VITE_SENTRY_DSN_STAGING` | Staging | Sentry | ⚠️ Optional* |
| `VITE_SENTRY_DSN_PROD` | Production | Sentry | ⚠️ Optional* |

*Optional secrets allow the app to deploy without analytics/monitoring, but functionality will be limited.

## Testing Deployment Setup

### 1. Test Secrets Configuration
```bash
# Check if secrets are properly configured
# This should be done via GitHub Actions, but you can verify locally:

# Test build with environment variables
VITE_ENVIRONMENT=staging npm run build
VITE_ENVIRONMENT=production npm run build
```

### 2. Manual Deployment Test
```bash
# Build and deploy to staging manually
npm run build
netlify deploy --dir=dist --site=your-staging-site-id

# Deploy to production
netlify deploy --dir=dist --site=your-prod-site-id --prod
```

## Deployment Workflow

### Staging Deployment (Automatic)
- **Trigger**: Push to `main` branch
- **Environment**: Staging
- **URL**: `https://staging-[commit-sha]--paperlyte-staging.netlify.app`

### Production Deployment (Manual)
- **Trigger**: GitHub Release creation
- **Environment**: Production  
- **URL**: `https://paperlyte-prod.netlify.app`

## Troubleshooting

### Common Issues

#### 1. "Context access might be invalid" Error
**Cause**: GitHub secrets not configured
**Solution**: Add all required secrets to repository settings

#### 2. Netlify Deployment Fails
**Cause**: Invalid `NETLIFY_AUTH_TOKEN` or `NETLIFY_SITE_ID`
**Solution**: 
- Verify token has correct permissions
- Check site ID matches your Netlify site
- Ensure site exists and is accessible

#### 3. Build Succeeds but App Doesn't Work
**Cause**: Missing or incorrect analytics/monitoring secrets
**Solution**:
- Check browser console for errors
- Verify PostHog and Sentry configurations
- Test with optional secrets first

#### 4. Environment Variables Not Working
**Cause**: Vite environment variable naming
**Solution**: All custom env vars must start with `VITE_`

### Debug Commands

```bash
# Check current environment in browser console
console.log(import.meta.env)

# Test PostHog connection
if (window.posthog) console.log('PostHog loaded')

# Test Sentry connection  
if (window.Sentry) console.log('Sentry loaded')
```

## Security Best Practices

### 1. Secret Management
- ✅ Never commit secrets to code
- ✅ Use different secrets for staging vs production
- ✅ Rotate secrets regularly
- ✅ Use minimal permissions for tokens

### 2. Environment Separation
- ✅ Separate PostHog projects for staging/prod
- ✅ Separate Sentry projects for staging/prod
- ✅ Separate Netlify sites for staging/prod
- ✅ Test staging thoroughly before production

### 3. Monitoring
- ✅ Set up alerts for deployment failures
- ✅ Monitor error rates after deployments
- ✅ Track performance metrics
- ✅ Review analytics regularly

## Next Steps

1. **Set up all required secrets** in GitHub repository settings
2. **Create Netlify sites** for staging and production
3. **Configure PostHog projects** (optional but recommended)
4. **Set up Sentry monitoring** (optional but recommended)
5. **Test deployment** by pushing to main branch
6. **Create first release** to test production deployment

For questions or issues, create a GitHub issue or contact the development team.