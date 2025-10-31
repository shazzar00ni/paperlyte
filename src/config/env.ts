/**
 * Environment Configuration Module
 *
 * Centralizes all environment variable access with validation and type safety.
 * Prevents runtime errors from missing or misconfigured environment variables.
 *
 * Usage:
 * ```typescript
 * import { config } from '@/config/env'
 *
 * // Access with autocomplete and type safety
 * const apiKey = config.posthog.apiKey
 * const isDev = config.isDevelopment
 * ```
 */

/**
 * Environment variable validation
 * Throws descriptive error if required variable is missing
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue

  if (value === undefined) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please add it to your .env file or set it in your deployment platform.`
    )
  }

  return value
}

/**
 * Optional environment variable retrieval
 * Returns undefined if not set, allowing for graceful degradation
 */
function getOptionalEnvVar(key: string): string | undefined {
  return import.meta.env[key]
}

/**
 * Application configuration object
 * All environment variables accessed through this singleton
 */
export const config = {
  // Application metadata
  app: {
    name: 'Paperlyte',
    version: getEnvVar('VITE_APP_VERSION', '0.1.0'),
    environment: getEnvVar('MODE', 'development'),
  },

  // Feature flags
  features: {
    // Whether analytics tracking is enabled
    analyticsEnabled: getOptionalEnvVar('VITE_POSTHOG_API_KEY') !== undefined,
    // Whether error monitoring is enabled
    monitoringEnabled: getOptionalEnvVar('VITE_SENTRY_DSN') !== undefined,
    // Enable debug logging in development
    debugMode: import.meta.env.DEV,
  },

  // PostHog Analytics configuration
  posthog: {
    apiKey: getOptionalEnvVar('VITE_POSTHOG_API_KEY'),
    host: getOptionalEnvVar('VITE_POSTHOG_HOST') || 'https://app.posthog.com',
  },

  // Sentry Error Monitoring configuration
  sentry: {
    dsn: getOptionalEnvVar('VITE_SENTRY_DSN'),
    environment: getEnvVar('MODE', 'development'),
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    // Don't send errors in development unless explicitly enabled
    enabled:
      getOptionalEnvVar('VITE_SENTRY_DSN') !== undefined &&
      !import.meta.env.DEV,
  },

  // Storage configuration
  storage: {
    // IndexedDB database name
    dbName: 'paperlyte_db',
    dbVersion: 1,
    // localStorage key prefixes
    localStoragePrefix: 'paperlyte_',
    // Storage quota warning threshold (in bytes)
    quotaWarningThreshold: 50 * 1024 * 1024, // 50MB
  },

  // API configuration (for future Q4 2025 migration)
  api: {
    baseUrl:
      getOptionalEnvVar('VITE_API_BASE_URL') || 'https://api.paperlyte.com',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // Development flags
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTest: import.meta.env.MODE === 'test',
} as const

/**
 * Type-safe config keys
 * Use this type for functions that accept config paths
 */
export type ConfigKey = keyof typeof config

/**
 * Validate configuration on module load
 * Logs warnings for missing optional configurations
 */
function validateConfig() {
  const warnings: string[] = []

  if (!config.features.analyticsEnabled) {
    warnings.push(
      'PostHog analytics is disabled (VITE_POSTHOG_API_KEY not set)'
    )
  }

  if (!config.features.monitoringEnabled) {
    warnings.push(
      'Sentry error monitoring is disabled (VITE_SENTRY_DSN not set)'
    )
  }

  if (warnings.length > 0 && config.isDevelopment) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  Configuration warnings:\n' + warnings.map(w => `  - ${w}`).join('\n')
    )
  }
}

// Run validation on import
validateConfig()

/**
 * Export individual config sections for convenience
 */
export const { app, features, posthog, sentry, storage, api } = config
