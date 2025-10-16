/**
 * Unit tests for Performance Audit Script
 *
 * Tests cover:
 * - PerformanceAuditor class instantiation and configuration
 * - Build process execution and error handling
 * - Preview server startup and health checks
 * - Server readiness validation with timeouts
 * - Lighthouse CI execution
 * - Graceful cleanup and process termination
 * - Error scenarios and edge cases
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

// Mock timers/promises
vi.mock('timers/promises', () => ({
  setTimeout: vi.fn((ms) => Promise.resolve()),
}))

// Helper to create mock process
class MockChildProcess extends EventEmitter {
  constructor() {
    super()
    this.stdout = new EventEmitter()
    this.stderr = new EventEmitter()
    this.killed = false
  }

  kill(signal) {
    this.killed = true
    this.emit('close', 0)
  }
}

describe('Performance Audit Script', () => {
  let PerformanceAuditor
  let mockSetTimeout

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock global fetch
    global.fetch = vi.fn()
    
    // Import the module fresh for each test
    const module = await import('../performance-audit.js')
    PerformanceAuditor = module.default || module.PerformanceAuditor
    
    mockSetTimeout = (await import('timers/promises')).setTimeout
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('PerformanceAuditor - Constructor', () => {
    it('should initialize with default options', () => {
      const auditor = new PerformanceAuditor()

      expect(auditor.port).toBe(4173)
      expect(auditor.host).toBe('localhost')
      expect(auditor.url).toBe('http://localhost:4173')
      expect(auditor.previewProcess).toBeNull()
      expect(auditor.lighthouseProcess).toBeNull()
    })

    it('should accept custom port and host', () => {
      const auditor = new PerformanceAuditor({
        port: 8080,
        host: '127.0.0.1',
      })

      expect(auditor.port).toBe(8080)
      expect(auditor.host).toBe('127.0.0.1')
      expect(auditor.url).toBe('http://127.0.0.1:8080')
    })

    it('should construct correct URL from host and port', () => {
      const auditor = new PerformanceAuditor({
        port: 3000,
        host: 'example.com',
      })

      expect(auditor.url).toBe('http://example.com:3000')
    })
  })

  describe('PerformanceAuditor - build()', () => {
    it('should successfully execute build command', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const buildPromise = auditor.build()

      // Simulate successful build
      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await expect(buildPromise).resolves.toBeUndefined()
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true,
      })
    })

    it('should reject on build failure', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const buildPromise = auditor.build()

      // Simulate build failure
      setTimeout(() => {
        mockProcess.emit('close', 1)
      }, 10)

      await expect(buildPromise).rejects.toThrow('Build failed with exit code 1')
    })

    it('should reject on process error', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const buildPromise = auditor.build()

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Command not found'))
      }, 10)

      await expect(buildPromise).rejects.toThrow('Build process error: Command not found')
    })
  })

  describe('PerformanceAuditor - startPreviewServer()', () => {
    it('should start server and resolve when ready', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Simulate server startup message
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Local: http://localhost:4173'))
      }, 10)

      await expect(serverPromise).resolves.toBeUndefined()
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'preview'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })
    })

    it('should recognize different server ready messages', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Simulate alternative server startup message
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Server running at localhost:4173'))
      }, 10)

      await expect(serverPromise).resolves.toBeUndefined()
    })

    it('should reject on port already in use error', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Simulate EADDRINUSE error
      setTimeout(() => {
        mockProcess.stderr.emit(
          'data',
          Buffer.from('Error: listen EADDRINUSE :::4173')
        )
      }, 10)

      await expect(serverPromise).rejects.toThrow('Port 4173 is already in use')
    })

    it('should reject on server process error', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Failed to start'))
      }, 10)

      await expect(serverPromise).rejects.toThrow(
        'Preview server failed to start: Failed to start'
      )
    })

    it('should reject on early server exit', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Simulate server crash
      setTimeout(() => {
        mockProcess.emit('close', 1)
      }, 10)

      await expect(serverPromise).rejects.toThrow(
        'Preview server exited with code 1'
      )
    })

    it('should resolve after fallback timeout', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)
      mockSetTimeout.mockResolvedValue(undefined)

      const serverPromise = auditor.startPreviewServer()

      // Wait for fallback timeout
      await new Promise(resolve => setTimeout(resolve, 100))

      await expect(serverPromise).resolves.toBeUndefined()
    })
  })

  describe('PerformanceAuditor - waitForServerReady()', () => {
    it('should resolve when server responds successfully', async () => {
      const auditor = new PerformanceAuditor()
      
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      mockSetTimeout.mockResolvedValue(undefined)

      await expect(auditor.waitForServerReady()).resolves.toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4173',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should retry on failed health checks', async () => {
      const auditor = new PerformanceAuditor()
      
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Connection refused'))
        }
        return Promise.resolve({ ok: true })
      })
      mockSetTimeout.mockResolvedValue(undefined)

      await expect(auditor.waitForServerReady()).resolves.toBeUndefined()
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should reject after max wait time', async () => {
      const auditor = new PerformanceAuditor()
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))
      mockSetTimeout.mockResolvedValue(undefined)

      // Mock Date.now to simulate timeout
      const originalDateNow = Date.now
      let timeElapsed = 0
      Date.now = vi.fn(() => {
        timeElapsed += 31000 // Exceed MAX_WAIT_TIME
        return timeElapsed
      })

      await expect(auditor.waitForServerReady()).rejects.toThrow(
        'Server did not become ready within'
      )

      Date.now = originalDateNow
    })

    it('should handle non-ok responses', async () => {
      const auditor = new PerformanceAuditor()
      
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 2) {
          return Promise.resolve({ ok: false, status: 503 })
        }
        return Promise.resolve({ ok: true })
      })
      mockSetTimeout.mockResolvedValue(undefined)

      await expect(auditor.waitForServerReady()).resolves.toBeUndefined()
    })
  })

  describe('PerformanceAuditor - healthCheck()', () => {
    it('should perform successful health check', async () => {
      const auditor = new PerformanceAuditor()
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const response = await auditor.healthCheck()

      expect(response.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4173',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          method: 'GET',
        })
      )
    })

    it('should timeout long-running requests', async () => {
      const auditor = new PerformanceAuditor()
      
      // Create a fetch that never resolves
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise(() => {}) // Never resolves
      })

      // This should timeout
      await expect(auditor.healthCheck()).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      const auditor = new PerformanceAuditor()
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(auditor.healthCheck()).rejects.toThrow('Network error')
    })
  })

  describe('PerformanceAuditor - runLighthouseCI()', () => {
    it('should execute Lighthouse CI successfully', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const lighthousePromise = auditor.runLighthouseCI()

      // Simulate successful run
      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await expect(lighthousePromise).resolves.toBeUndefined()
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'lighthouse:ci'], {
        stdio: 'inherit',
        shell: true,
        env: expect.objectContaining({
          LHCI_BUILD_CONTEXT__CURRENT_HASH: expect.any(String),
        }),
      })
    })

    it('should use GITHUB_SHA when available', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()
      const originalEnv = process.env.GITHUB_SHA

      process.env.GITHUB_SHA = 'abc123'
      spawn.mockReturnValue(mockProcess)

      const lighthousePromise = auditor.runLighthouseCI()

      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 10)

      await lighthousePromise

      expect(spawn).toHaveBeenCalledWith(
        'npm',
        ['run', 'lighthouse:ci'],
        expect.objectContaining({
          env: expect.objectContaining({
            LHCI_BUILD_CONTEXT__CURRENT_HASH: 'abc123',
          }),
        })
      )

      process.env.GITHUB_SHA = originalEnv
    })

    it('should reject on Lighthouse CI failure', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const lighthousePromise = auditor.runLighthouseCI()

      // Simulate failure
      setTimeout(() => {
        mockProcess.emit('close', 1)
      }, 10)

      await expect(lighthousePromise).rejects.toThrow(
        'Lighthouse CI failed with exit code 1'
      )
    })

    it('should reject on process error', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const lighthousePromise = auditor.runLighthouseCI()

      // Simulate error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Command failed'))
      }, 10)

      await expect(lighthousePromise).rejects.toThrow(
        'Lighthouse CI error: Command failed'
      )
    })
  })

  describe('PerformanceAuditor - cleanup()', () => {
    it('should kill preview and lighthouse processes', async () => {
      const auditor = new PerformanceAuditor()
      const mockPreviewProcess = new MockChildProcess()
      const mockLighthouseProcess = new MockChildProcess()

      auditor.previewProcess = mockPreviewProcess
      auditor.lighthouseProcess = mockLighthouseProcess

      const killSpyPreview = vi.spyOn(mockPreviewProcess, 'kill')
      const killSpyLighthouse = vi.spyOn(mockLighthouseProcess, 'kill')

      await auditor.cleanup()

      expect(killSpyPreview).toHaveBeenCalledWith('SIGTERM')
      expect(killSpyLighthouse).toHaveBeenCalledWith('SIGTERM')
    })

    it('should not error when processes are null', async () => {
      const auditor = new PerformanceAuditor()

      await expect(auditor.cleanup()).resolves.toBeUndefined()
    })

    it('should not kill already killed processes', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()
      mockProcess.killed = true
      auditor.previewProcess = mockProcess

      const killSpy = vi.spyOn(mockProcess, 'kill')

      await auditor.cleanup()

      expect(killSpy).not.toHaveBeenCalled()
    })

    it('should force kill stubborn processes with SIGKILL', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()
      auditor.previewProcess = mockProcess

      // Override kill to not mark as killed immediately
      const killSpy = vi.spyOn(mockProcess, 'kill').mockImplementation(() => {
        // Don't mark as killed to simulate stubborn process
      })

      mockSetTimeout.mockResolvedValue(undefined)

      await auditor.cleanup()

      // Should be called twice: SIGTERM and SIGKILL
      expect(killSpy).toHaveBeenCalledTimes(2)
      expect(killSpy).toHaveBeenNthCalledWith(1, 'SIGTERM')
      expect(killSpy).toHaveBeenNthCalledWith(2, 'SIGKILL')
    })
  })

  describe('PerformanceAuditor - run() integration', () => {
    it('should execute full audit workflow successfully', async () => {
      const auditor = new PerformanceAuditor()
      
      // Mock all subprocess calls
      spawn.mockImplementation((cmd, args) => {
        const mockProcess = new MockChildProcess()
        setTimeout(() => {
          if (args.includes('build')) {
            mockProcess.emit('close', 0)
          } else if (args.includes('preview')) {
            setTimeout(() => {
              mockProcess.stdout.emit('data', Buffer.from('Local: http://localhost:4173'))
            }, 5)
          } else if (args.includes('lighthouse:ci')) {
            mockProcess.emit('close', 0)
          }
        }, 10)
        return mockProcess
      })

      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      mockSetTimeout.mockResolvedValue(undefined)

      // Mock process.exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})

      const runPromise = auditor.run()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(spawn).toHaveBeenCalledTimes(3) // build, preview, lighthouse
      expect(exitSpy).toHaveBeenCalledWith(0)

      exitSpy.mockRestore()
    })

    it('should handle build failure and exit with code 1', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()

      spawn.mockReturnValue(mockProcess)

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})

      const runPromise = auditor.run()

      // Simulate build failure
      setTimeout(() => {
        mockProcess.emit('close', 1)
      }, 10)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(exitSpy).toHaveBeenCalledWith(1)

      exitSpy.mockRestore()
    })

    it('should cleanup on error', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()
      auditor.previewProcess = mockProcess

      spawn.mockReturnValue(mockProcess)

      const cleanupSpy = vi.spyOn(auditor, 'cleanup')
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})

      const runPromise = auditor.run()

      // Simulate error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Test error'))
      }, 10)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(cleanupSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)

      exitSpy.mockRestore()
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle missing stdout/stderr gracefully', async () => {
      const auditor = new PerformanceAuditor()
      const mockProcess = new MockChildProcess()
      delete mockProcess.stdout
      delete mockProcess.stderr

      spawn.mockReturnValue(mockProcess)

      const serverPromise = auditor.startPreviewServer()

      // Should still resolve via fallback timeout
      mockSetTimeout.mockResolvedValue(undefined)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await expect(serverPromise).resolves.toBeUndefined()
    })

    it('should handle custom port configurations', async () => {
      const auditor = new PerformanceAuditor({ port: 8080 })
      
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      mockSetTimeout.mockResolvedValue(undefined)

      await auditor.waitForServerReady()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080',
        expect.any(Object)
      )
    })

    it('should handle multiple simultaneous health check failures', async () => {
      const auditor = new PerformanceAuditor()
      
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValue({ ok: true })
      
      mockSetTimeout.mockResolvedValue(undefined)

      await expect(auditor.waitForServerReady()).resolves.toBeUndefined()
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('should handle process cleanup when processes are undefined', async () => {
      const auditor = new PerformanceAuditor()
      auditor.previewProcess = undefined
      auditor.lighthouseProcess = undefined

      await expect(auditor.cleanup()).resolves.toBeUndefined()
    })
  })
})