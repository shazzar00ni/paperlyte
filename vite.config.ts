import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/config': resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // Set relaxed CSP headers for development server (will be stricter in production)
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:;",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    port: 4173,
    headers: {
      // Strict CSP for preview/production testing
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' https://app.posthog.com https://*.ingest.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://app.posthog.com https://*.ingest.sentry.io https://*.sentry.io; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy':
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    },
  },
  build: {
    outDir: 'dist',
    // Only enable sourcemaps in development mode for security
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Core React dependencies
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom')
          ) {
            return 'vendor'
          }
          // Router in separate chunk (shared across routes)
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
          // Analytics and monitoring (lazy-loaded)
          if (id.includes('posthog') || id.includes('@sentry')) {
            return 'analytics'
          }
          // IndexedDB utilities (only needed for editor/admin)
          if (id.includes('fake-indexeddb') || id.includes('idb')) {
            return 'storage'
          }
          // Default: include in main bundle or route-specific chunks
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  define: {
    // Make environment variables available at build time
    __POSTHOG_API_KEY__: JSON.stringify(process.env.VITE_POSTHOG_API_KEY),
    __POSTHOG_HOST__: JSON.stringify(process.env.VITE_POSTHOG_HOST),
    __SENTRY_DSN__: JSON.stringify(process.env.VITE_SENTRY_DSN),
  },
}))
