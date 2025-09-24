import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  define: {
    // Make environment variables available at build time
    __POSTHOG_API_KEY__: JSON.stringify(process.env.VITE_POSTHOG_API_KEY),
    __POSTHOG_HOST__: JSON.stringify(process.env.VITE_POSTHOG_HOST),
    __SENTRY_DSN__: JSON.stringify(process.env.VITE_SENTRY_DSN),
  }
})