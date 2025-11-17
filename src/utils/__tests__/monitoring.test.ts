import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { safeLogError, monitoring } from '../monitoring'

describe('safeLogError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Spy on monitoring.logError
    vi.spyOn(monitoring, 'logError')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call monitoring.logError successfully', () => {
    const testError = new Error('Test error')
    const context = { feature: 'test', action: 'test_action' }

    // Mock monitoring.logError to do nothing (simulate successful logging)
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    safeLogError(testError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(testError, context)
    // When monitoring.logError succeeds, console.error should not be called by safeLogError
    // (Note: monitoring.logError itself may call console.error if not initialized,
    // but that's internal to monitoring.logError, not safeLogError's fallback)
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Failed to log error to monitoring service:',
      expect.anything()
    )
  })

  it('should fall back to console.error if monitoring.logError throws', () => {
    const testError = new Error('Test error')
    const context = { feature: 'test', action: 'test_action' }
    const monitoringError = new Error('Monitoring service unavailable')

    // Mock monitoring.logError to throw
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {
      throw monitoringError
    })

    safeLogError(testError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(testError, context)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to log error to monitoring service:',
      monitoringError
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Original error:',
      testError,
      context
    )
  })

  it('should work without context parameter', () => {
    const testError = new Error('Test error without context')

    // Mock monitoring.logError to do nothing (simulate successful logging)
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    safeLogError(testError)

    expect(monitoring.logError).toHaveBeenCalledWith(testError, undefined)
    // When monitoring.logError succeeds, safeLogError's fallback should not be triggered
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Failed to log error to monitoring service:',
      expect.anything()
    )
  })

  it('should handle monitoring.logError throwing and log both errors to console', () => {
    const testError = new Error('Original error')
    const monitoringError = new Error('Monitoring failed')

    vi.spyOn(monitoring, 'logError').mockImplementation(() => {
      throw monitoringError
    })

    // Should not throw
    expect(() => safeLogError(testError)).not.toThrow()

    // Should have logged to console
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
  })
})
