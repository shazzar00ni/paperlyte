/// <reference types="vitest" />
import { defineConfig } from 'vite'
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
    // Set relaxed CSP headers for development server (will be stricter in production)
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:;",
    },
  },
  build: {
    outDir: 'dist',
    // Only enable sourcemaps in development mode for security
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  define: {
    // Make environment variables available at build time
    __POSTHOG_API_KEY__: JSON.stringify(process.env.VITE_POSTHOG_API_KEY),
    __POSTHOG_HOST__: JSON.stringify(process.env.VITE_POSTHOG_HOST),
    __SENTRY_DSN__: JSON.stringify(process.env.VITE_SENTRY_DSN),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}))