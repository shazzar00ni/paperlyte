#!/usr/bin/env node

/**
 * Cross-platform performance audit script
 *
 * This script:
 * 1. Builds the application
 * 2. Starts the preview server
 * 3. Waits for server readiness with health checks
 * 4. Runs Lighthouse CI
 * 5. Gracefully shuts down the server
 */

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

const DEFAULT_PORT = 4173
const DEFAULT_HOST = 'localhost'
const MAX_WAIT_TIME = 30000 // 30 seconds
const HEALTH_CHECK_INTERVAL = 1000 // 1 second

class PerformanceAuditor {
  constructor(options = {}) {
    this.port = options.port || DEFAULT_PORT
    this.host = options.host || DEFAULT_HOST
    this.url = `http://${this.host}:${this.port}`
    this.previewProcess = null
    this.lighthouseProcess = null
  }

  /**
   * Main audit workflow
   */
  async run() {
    try {
      console.log('🏗️  Building application...')
      await this.build()

      console.log('🚀 Starting preview server...')
      await this.startPreviewServer()

      console.log('⏳ Waiting for server readiness...')
      await this.waitForServerReady()

      console.log('🔍 Running Lighthouse CI audit...')
      await this.runLighthouseCI()

      console.log('✅ Performance audit completed successfully!')
      process.exit(0)
    } catch (error) {
      console.error('❌ Performance audit failed:', error.message)
      process.exit(1)
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Build the application
   */
  async build() {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true,
      })

      buildProcess.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Build failed with exit code ${code}`))
        }
      })

      buildProcess.on('error', error => {
        reject(new Error(`Build process error: ${error.message}`))
      })
    })
  }

  /**
   * Start the preview server
   */
  async startPreviewServer() {
    return new Promise((resolve, reject) => {
      this.previewProcess = spawn('npm', ['run', 'preview'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })

      let serverStarted = false

      // Listen for server start confirmation
      this.previewProcess.stdout?.on('data', data => {
        const output = data.toString()
        if (
          output.includes('Local:') ||
          output.includes(`localhost:${this.port}`)
        ) {
          serverStarted = true
          resolve()
        }
      })

      this.previewProcess.stderr?.on('data', data => {
        const error = data.toString()
        if (!serverStarted && error.includes('EADDRINUSE')) {
          reject(new Error(`Port ${this.port} is already in use`))
        }
      })

      this.previewProcess.on('error', error => {
        if (!serverStarted) {
          reject(new Error(`Preview server failed to start: ${error.message}`))
        }
      })

      this.previewProcess.on('close', code => {
        if (!serverStarted && code !== 0) {
          reject(new Error(`Preview server exited with code ${code}`))
        }
      })

      // Fallback timeout
      setTimeout(() => {
        if (!serverStarted) {
          resolve() // Continue to health check
        }
      }, 5000)
    })
  }

  /**
   * Wait for server to be ready with health checks
   */
  async waitForServerReady() {
    const startTime = Date.now()

    while (Date.now() - startTime < MAX_WAIT_TIME) {
      try {
        // Try to fetch the root page
        const response = await this.healthCheck()
        if (response.ok) {
          console.log(`✅ Server is ready at ${this.url}`)
          return
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      await setTimeout(HEALTH_CHECK_INTERVAL)
    }

    throw new Error(`Server did not become ready within ${MAX_WAIT_TIME}ms`)
  }

  /**
   * Perform health check on the server
   */
  async healthCheck() {
    // Use built-in fetch if available (Node 18+), otherwise need to implement
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    try {
      const response = await fetch(this.url, {
        signal: controller.signal,
        method: 'GET',
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Run Lighthouse CI
   */
  async runLighthouseCI() {
    return new Promise((resolve, reject) => {
      this.lighthouseProcess = spawn('npm', ['run', 'lighthouse:ci'], {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          LHCI_BUILD_CONTEXT__CURRENT_HASH: process.env.GITHUB_SHA || 'local',
        },
      })

      this.lighthouseProcess.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Lighthouse CI failed with exit code ${code}`))
        }
      })

      this.lighthouseProcess.on('error', error => {
        reject(new Error(`Lighthouse CI error: ${error.message}`))
      })
    })
  }

  /**
   * Clean up processes
   */
  async cleanup() {
    console.log('🧹 Cleaning up...')

    if (this.lighthouseProcess && !this.lighthouseProcess.killed) {
      this.lighthouseProcess.kill('SIGTERM')
    }

    if (this.previewProcess && !this.previewProcess.killed) {
      this.previewProcess.kill('SIGTERM')

      // Give it time to shut down gracefully
      await setTimeout(2000)

      if (!this.previewProcess.killed) {
        this.previewProcess.kill('SIGKILL')
      }
    }
  }
}

// Simple fetch polyfill for older Node versions
async function fetch(url, options = {}) {
  const https = await import('https')
  const http = await import('http')
  const { URL } = await import('url')

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const client = parsedUrl.protocol === 'https:' ? https : http

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        timeout: 3000,
        ...options,
      },
      res => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Request aborted'))
      })
    }

    req.end()
  })
}

// Handle process signals for graceful shutdown
const auditor = new PerformanceAuditor()

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  await auditor.cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  await auditor.cleanup()
  process.exit(0)
})

// Run the audit
auditor.run()
