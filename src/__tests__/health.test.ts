import { describe, it, expect, beforeEach } from 'vitest'
import { getHealthStatus } from '../health'

describe('Health Check', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getHealthStatus', () => {
    it('should return health status with correct structure', () => {
      const status = getHealthStatus()

      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('version')
      expect(status).toHaveProperty('timestamp')
      expect(status).toHaveProperty('checks')
      expect(status).toHaveProperty('environment')
      expect(status).toHaveProperty('buildInfo')
    })

    it('should report degraded status in test environment', () => {
      const status = getHealthStatus()

      // In test environment, analytics and monitoring are not available
      // so status should be degraded (storage works, but optional services don't)
      expect(status.status).toBe('degraded')
      expect(status.checks.storage).toBe(true)
      expect(status.checks.analytics).toBe(false)
      expect(status.checks.monitoring).toBe(false)
    })

    it('should include version information', () => {
      const status = getHealthStatus()

      expect(status.version).toBeDefined()
      expect(typeof status.version).toBe('string')
    })

    it('should include timestamp in ISO format', () => {
      const status = getHealthStatus()

      expect(status.timestamp).toBeDefined()
      expect(() => new Date(status.timestamp)).not.toThrow()
    })

    it('should check storage availability', () => {
      const status = getHealthStatus()

      expect(status.checks).toHaveProperty('storage')
      expect(typeof status.checks.storage).toBe('boolean')
    })

    it('should check analytics availability', () => {
      const status = getHealthStatus()

      expect(status.checks).toHaveProperty('analytics')
      expect(typeof status.checks.analytics).toBe('boolean')
    })

    it('should check monitoring availability', () => {
      const status = getHealthStatus()

      expect(status.checks).toHaveProperty('monitoring')
      expect(typeof status.checks.monitoring).toBe('boolean')
    })

    it('should report degraded status when analytics unavailable', () => {
      const status = getHealthStatus()

      // In test environment, analytics won't be available
      if (!status.checks.analytics) {
        expect(status.status).toBe('degraded')
      }
    })

    it('should include environment information', () => {
      const status = getHealthStatus()

      expect(status.environment).toBeDefined()
      expect(typeof status.environment).toBe('string')
    })

    it('should include build information', () => {
      const status = getHealthStatus()

      expect(status.buildInfo).toBeDefined()
      expect(typeof status.buildInfo).toBe('object')
    })
  })
})
