/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

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
    },
  },
  server: {
    port: 3000,
    open: true,
    // SECURITY: Development CSP includes unsafe directives for Vite HMR
    // WARNING: Only run the development server on trusted, isolated networks (localhost)
    // Never expose the development server to untrusted networks or the internet
    // Production deployments must use stricter CSP via HTTP headers with nonces/hashes
    // See docs/SECURITY_CSP.md for production configuration guidance
    headers: {
      'Content-Security-Policy':
        mode === 'development'
          ? "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:;"
          : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:;",
    },
    // Bind to localhost only for security (do not use 0.0.0.0 in untrusted environments)
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
    // Only enable sourcemaps in development mode for security
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          monitoring: ['@sentry/react', 'posthog-js'],
          utils: ['dompurify', 'lucide-react'],
        },
      },
    },
    // Optimize chunk sizes for better loading performance
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking for better bundle optimization
    target: 'es2020',
    minify: 'esbuild',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      lines: 60,
      functions: 60,
      branches: 50,
    },
    css: true,
  },
  define: {
    // Make environment variables available at build time
    __POSTHOG_API_KEY__: JSON.stringify(process.env.VITE_POSTHOG_API_KEY),
    __POSTHOG_HOST__: JSON.stringify(process.env.VITE_POSTHOG_HOST),
    __SENTRY_DSN__: JSON.stringify(process.env.VITE_SENTRY_DSN),
  },
}))