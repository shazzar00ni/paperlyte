/**
 * Unit tests for Lighthouse Helper utilities
 *
 * Tests cover:
 * - Reading and parsing Lighthouse CI results
 * - Handling missing files and invalid data
 * - Parsing performance targets from configuration
 * - Mock results for testing scenarios
 */

import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import {
  readLatestLighthouseResults,
  getPerformanceTargets,
  getMockResults,
} from '../lighthouseHelper.js'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}))

// Mock console methods to avoid cluttering test output
const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log,
}

describe('Lighthouse Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console to suppress warnings in tests
    console.warn = vi.fn()
    console.error = vi.fn()
    console.log = vi.fn()
  })

  afterEach(() => {
    // Restore console
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.log = originalConsole.log
  })

  describe('readLatestLighthouseResults', () => {
    const mockManifestPath = path.resolve(process.cwd(), '.lighthouseci/manifest.json')

    it('should return null when manifest file does not exist', () => {
      fs.existsSync.mockReturnValue(false)

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith(
        'Lighthouse CI results not found. Run `npm run lighthouse:ci` first.'
      )
    })

    it('should return null when manifest is empty', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue('[]')

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith('No Lighthouse runs found in manifest.')
    })

    it('should return null when manifest is null', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue('null')

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith('No Lighthouse runs found in manifest.')
    })

    it('should return null when results file does not exist', () => {
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('manifest.json')) return true
        return false
      })
      fs.readFileSync.mockReturnValue(JSON.stringify([{ jsonPath: 'results.json' }]))

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Lighthouse results file not found:')
      )
    })

    it('should successfully parse valid Lighthouse results', () => {
      const mockManifest = [
        {
          jsonPath: 'lhr-12345.json',
          url: 'http://localhost:4173',
        },
      ]

      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.96 },
          accessibility: { score: 1.0 },
          'best-practices': { score: 0.95 },
          seo: { score: 0.91 },
        },
        audits: {
          'first-contentful-paint': { numericValue: 1200 },
          'largest-contentful-paint': { numericValue: 1400 },
          'cumulative-layout-shift': { numericValue: 0.0 },
          'total-blocking-time': { numericValue: 230 },
          'speed-index': { numericValue: 1500 },
          'interactive': { numericValue: 2000 },
          'total-byte-weight': { numericValue: 500000 },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(96)
      expect(result.lighthouse.accessibility).toBe(100)
      expect(result.lighthouse.bestPractices).toBe(95)
      expect(result.lighthouse.seo).toBe(91)
      expect(result.coreWebVitals.fcp).toBe(1200)
      expect(result.coreWebVitals.lcp).toBe(1400)
      expect(result.coreWebVitals.cls).toBe(0.0)
      expect(result.coreWebVitals.tbt).toBe(230)
      expect(result.metrics.speedIndex).toBe(1500)
      expect(result.metrics.timeToInteractive).toBe(2000)
      expect(result.metrics.totalByteWeight).toBe(500000)
    })

    it('should handle missing category scores gracefully', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {},
        audits: {},
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(0)
      expect(result.lighthouse.accessibility).toBe(0)
      expect(result.lighthouse.bestPractices).toBe(0)
      expect(result.lighthouse.seo).toBe(0)
      expect(result.coreWebVitals.fcp).toBe(0)
      expect(result.coreWebVitals.lcp).toBe(0)
      expect(result.coreWebVitals.cls).toBe(0)
      expect(result.coreWebVitals.tbt).toBe(0)
    })

    it('should handle partial audit data', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.85 },
        },
        audits: {
          'first-contentful-paint': { numericValue: 1500 },
          // Missing other audits
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(85)
      expect(result.lighthouse.accessibility).toBe(0)
      expect(result.coreWebVitals.fcp).toBe(1500)
      expect(result.coreWebVitals.lcp).toBe(0)
    })

    it('should return null and log error on JSON parse failure', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue('invalid json{')

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        'Error reading Lighthouse results:',
        expect.any(String)
      )
    })

    it('should handle file system errors gracefully', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })

      const result = readLatestLighthouseResults()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        'Error reading Lighthouse results:',
        'File read error'
      )
    })

    it('should round scores to nearest integer', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.956 }, // Should round to 96
          accessibility: { score: 0.994 }, // Should round to 99
          'best-practices': { score: 0.945 }, // Should round to 95
          seo: { score: 0.889 }, // Should round to 89
        },
        audits: {},
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result.lighthouse.performance).toBe(96)
      expect(result.lighthouse.accessibility).toBe(99)
      expect(result.lighthouse.bestPractices).toBe(95)
      expect(result.lighthouse.seo).toBe(89)
    })
  })

  describe('getPerformanceTargets', () => {
    it('should return default targets when config file does not exist', () => {
      fs.existsSync.mockReturnValue(false)

      const targets = getPerformanceTargets()

      expect(targets).toEqual({
        lighthouse: {
          performance: 90,
          accessibility: 100,
          bestPractices: 95,
          seo: 85,
        },
        coreWebVitals: {
          fcp: 1800,
          lcp: 2500,
          cls: 0.1,
          tbt: 300,
        },
      })
      expect(console.warn).toHaveBeenCalledWith(
        'lighthouserc.json not found, using default targets'
      )
    })

    it('should parse targets from valid lighthouserc.json', () => {
      const mockConfig = {
        ci: {
          assert: {
            assertions: {
              'categories:performance': ['error', { minScore: 0.75 }],
              'categories:accessibility': ['error', { minScore: 0.9 }],
              'categories:best-practices': ['error', { minScore: 0.9 }],
              'categories:seo': ['error', { minScore: 0.8 }],
              'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
              'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
              'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
              'total-blocking-time': ['warn', { maxNumericValue: 300 }],
            },
          },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const targets = getPerformanceTargets()

      expect(targets.lighthouse.performance).toBe(75)
      expect(targets.lighthouse.accessibility).toBe(90)
      expect(targets.lighthouse.bestPractices).toBe(90)
      expect(targets.lighthouse.seo).toBe(80)
      expect(targets.coreWebVitals.fcp).toBe(2000)
      expect(targets.coreWebVitals.lcp).toBe(3000)
      expect(targets.coreWebVitals.cls).toBe(0.1)
      expect(targets.coreWebVitals.tbt).toBe(300)
    })

    it('should use defaults for missing assertion values', () => {
      const mockConfig = {
        ci: {
          assert: {
            assertions: {
              'categories:performance': ['error', { minScore: 0.85 }],
              // Missing other assertions
            },
          },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const targets = getPerformanceTargets()

      expect(targets.lighthouse.performance).toBe(85)
      expect(targets.lighthouse.accessibility).toBe(100)
      expect(targets.lighthouse.bestPractices).toBe(95)
      expect(targets.lighthouse.seo).toBe(85)
      expect(targets.coreWebVitals.fcp).toBe(1800)
      expect(targets.coreWebVitals.lcp).toBe(2500)
    })

    it('should handle empty config gracefully', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue('{}')

      const targets = getPerformanceTargets()

      expect(targets).toEqual({
        lighthouse: {
          performance: 90,
          accessibility: 100,
          bestPractices: 95,
          seo: 85,
        },
        coreWebVitals: {
          fcp: 1800,
          lcp: 2500,
          cls: 0.1,
          tbt: 300,
        },
      })
    })

    it('should return defaults on JSON parse error', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue('invalid json')

      const targets = getPerformanceTargets()

      expect(targets).toEqual({
        lighthouse: {
          performance: 90,
          accessibility: 100,
          bestPractices: 95,
          seo: 85,
        },
        coreWebVitals: {
          fcp: 1800,
          lcp: 2500,
          cls: 0.1,
          tbt: 300,
        },
      })
      expect(console.error).toHaveBeenCalledWith(
        'Error reading lighthouserc.json:',
        expect.any(String)
      )
    })

    it('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const targets = getPerformanceTargets()

      expect(targets).toEqual({
        lighthouse: {
          performance: 90,
          accessibility: 100,
          bestPractices: 95,
          seo: 85,
        },
        coreWebVitals: {
          fcp: 1800,
          lcp: 2500,
          cls: 0.1,
          tbt: 300,
        },
      })
      expect(console.error).toHaveBeenCalledWith(
        'Error reading lighthouserc.json:',
        'Permission denied'
      )
    })

    it('should handle malformed assertion structure', () => {
      const mockConfig = {
        ci: {
          assert: {
            assertions: {
              'categories:performance': ['error'],
              // Missing score object
            },
          },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const targets = getPerformanceTargets()

      expect(targets.lighthouse.performance).toBe(90)
    })
  })

  describe('getMockResults', () => {
    it('should return consistent mock results', () => {
      const mockResults1 = getMockResults()
      const mockResults2 = getMockResults()

      expect(mockResults1).toEqual(mockResults2)
    })

    it('should return valid performance scores', () => {
      const mockResults = getMockResults()

      expect(mockResults.lighthouse.performance).toBe(96)
      expect(mockResults.lighthouse.accessibility).toBe(100)
      expect(mockResults.lighthouse.bestPractices).toBe(100)
      expect(mockResults.lighthouse.seo).toBe(91)
    })

    it('should return valid Core Web Vitals', () => {
      const mockResults = getMockResults()

      expect(mockResults.coreWebVitals.fcp).toBe(1200)
      expect(mockResults.coreWebVitals.lcp).toBe(1400)
      expect(mockResults.coreWebVitals.cls).toBe(0.0)
      expect(mockResults.coreWebVitals.tbt).toBe(230)
    })

    it('should have expected data structure', () => {
      const mockResults = getMockResults()

      expect(mockResults).toHaveProperty('lighthouse')
      expect(mockResults).toHaveProperty('coreWebVitals')
      expect(mockResults.lighthouse).toHaveProperty('performance')
      expect(mockResults.lighthouse).toHaveProperty('accessibility')
      expect(mockResults.lighthouse).toHaveProperty('bestPractices')
      expect(mockResults.lighthouse).toHaveProperty('seo')
      expect(mockResults.coreWebVitals).toHaveProperty('fcp')
      expect(mockResults.coreWebVitals).toHaveProperty('lcp')
      expect(mockResults.coreWebVitals).toHaveProperty('cls')
      expect(mockResults.coreWebVitals).toHaveProperty('tbt')
    })

    it('should return values that meet typical performance targets', () => {
      const mockResults = getMockResults()
      const defaultTargets = {
        lighthouse: {
          performance: 90,
          accessibility: 100,
          bestPractices: 95,
          seo: 85,
        },
        coreWebVitals: {
          fcp: 1800,
          lcp: 2500,
          cls: 0.1,
          tbt: 300,
        },
      }

      expect(mockResults.lighthouse.performance).toBeGreaterThanOrEqual(
        defaultTargets.lighthouse.performance
      )
      expect(mockResults.lighthouse.accessibility).toBeGreaterThanOrEqual(
        defaultTargets.lighthouse.accessibility
      )
      expect(mockResults.lighthouse.bestPractices).toBeGreaterThanOrEqual(
        defaultTargets.lighthouse.bestPractices
      )
      expect(mockResults.lighthouse.seo).toBeGreaterThanOrEqual(
        defaultTargets.lighthouse.seo
      )
      expect(mockResults.coreWebVitals.fcp).toBeLessThanOrEqual(
        defaultTargets.coreWebVitals.fcp
      )
      expect(mockResults.coreWebVitals.lcp).toBeLessThanOrEqual(
        defaultTargets.coreWebVitals.lcp
      )
      expect(mockResults.coreWebVitals.cls).toBeLessThanOrEqual(
        defaultTargets.coreWebVitals.cls
      )
      expect(mockResults.coreWebVitals.tbt).toBeLessThanOrEqual(
        defaultTargets.coreWebVitals.tbt
      )
    })
  })

  describe('Integration - Multiple functions', () => {
    it('should work together in realistic scenario', () => {
      // Setup: No lighthouse results available
      fs.existsSync.mockReturnValue(false)

      const results = readLatestLighthouseResults()
      const targets = getPerformanceTargets()
      const mockResults = getMockResults()

      // When results aren't available, we should fall back to mock results
      expect(results).toBeNull()
      expect(mockResults).toBeDefined()

      // Mock results should meet default targets
      expect(mockResults.lighthouse.performance).toBeGreaterThanOrEqual(
        targets.lighthouse.performance
      )
    })

    it('should validate real results against targets', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.92 },
          accessibility: { score: 1.0 },
          'best-practices': { score: 0.98 },
          seo: { score: 0.87 },
        },
        audits: {
          'first-contentful-paint': { numericValue: 1500 },
          'largest-contentful-paint': { numericValue: 2200 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'total-blocking-time': { numericValue: 250 },
          'speed-index': { numericValue: 1800 },
          'interactive': { numericValue: 2500 },
          'total-byte-weight': { numericValue: 450000 },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        if (filePath.includes('lighthouserc.json')) {
          return JSON.stringify({
            ci: {
              assert: {
                assertions: {
                  'categories:performance': ['error', { minScore: 0.9 }],
                  'categories:accessibility': ['error', { minScore: 1.0 }],
                },
              },
            },
          })
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const results = readLatestLighthouseResults()
      const targets = getPerformanceTargets()

      expect(results.lighthouse.performance).toBeGreaterThanOrEqual(
        targets.lighthouse.performance
      )
      expect(results.lighthouse.accessibility).toBeGreaterThanOrEqual(
        targets.lighthouse.accessibility
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined categories and audits', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {}

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(0)
      expect(result.coreWebVitals.fcp).toBe(0)
    })

    it('should handle null scores in categories', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {
          performance: { score: null },
          accessibility: null,
        },
        audits: {},
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(0)
      expect(result.lighthouse.accessibility).toBe(0)
    })

    it('should handle very small and very large scores correctly', () => {
      const mockManifest = [{ jsonPath: 'lhr-12345.json' }]
      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.001 }, // Should round to 0
          accessibility: { score: 0.999 }, // Should round to 100
          'best-practices': { score: 1.0 }, // Should be 100
          seo: { score: 0.0 }, // Should be 0
        },
        audits: {
          'first-contentful-paint': { numericValue: 0.5 },
          'largest-contentful-paint': { numericValue: 9999999 },
        },
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        return JSON.stringify(mockLighthouseResults)
      })

      const result = readLatestLighthouseResults()

      expect(result.lighthouse.performance).toBe(0)
      expect(result.lighthouse.accessibility).toBe(100)
      expect(result.lighthouse.bestPractices).toBe(100)
      expect(result.lighthouse.seo).toBe(0)
      expect(result.coreWebVitals.fcp).toBe(0.5)
      expect(result.coreWebVitals.lcp).toBe(9999999)
    })

    it('should handle multiple runs in manifest and use latest', () => {
      const mockManifest = [
        { jsonPath: 'lhr-latest.json', url: 'http://localhost:4173' },
        { jsonPath: 'lhr-old.json', url: 'http://localhost:4173' },
        { jsonPath: 'lhr-older.json', url: 'http://localhost:4173' },
      ]

      const mockLighthouseResults = {
        categories: {
          performance: { score: 0.95 },
        },
        audits: {},
      }

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('manifest.json')) {
          return JSON.stringify(mockManifest)
        }
        if (filePath.includes('lhr-latest.json')) {
          return JSON.stringify(mockLighthouseResults)
        }
        throw new Error('Should use latest run')
      })

      const result = readLatestLighthouseResults()

      expect(result).not.toBeNull()
      expect(result.lighthouse.performance).toBe(95)
    })
  })
})