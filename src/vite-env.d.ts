/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_POSTHOG_API_KEY: string
  readonly VITE_POSTHOG_HOST: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_DEV_ENABLED: string
  readonly VITE_APP_VERSION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_REPORTING: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}