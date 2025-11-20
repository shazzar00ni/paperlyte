import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  safeLogError,
  monitoring,
  logError,
  logWarning,
  trackPerformance,
  addBreadcrumb,
  ErrorContext,
  PerformanceMetric,
} from '../monitoring'
import * as Sentry from '@sentry/react'
import { analytics } from '../analytics'

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

  it('should handle Error objects with custom properties', () => {
    const customError = new Error('Custom error')
    ;(customError as any).statusCode = 500
    ;(customError as any).responseData = { message: 'Internal error' }

    const context: ErrorContext = {
      feature: 'api',
      action: 'fetch_data',
      additionalData: { endpoint: '/api/notes' },
    }

    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    expect(() => safeLogError(customError, context)).not.toThrow()
    expect(monitoring.logError).toHaveBeenCalledWith(customError, context)
  })

  it('should handle context with all optional properties', () => {
    const testError = new Error('Test error')
    const fullContext: ErrorContext = {
      userId: 'user-123',
      userEmail: 'test@example.com',
      feature: 'notes',
      action: 'create_note',
      additionalData: {
        noteId: 'note-456',
        timestamp: Date.now(),
      },
    }

    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    safeLogError(testError, fullContext)

    expect(monitoring.logError).toHaveBeenCalledWith(testError, fullContext)
  })

  it('should handle TypeError objects', () => {
    const typeError = new TypeError('Cannot read property of undefined')
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    expect(() => safeLogError(typeError)).not.toThrow()
    expect(monitoring.logError).toHaveBeenCalledWith(typeError, undefined)
  })

  it('should handle ReferenceError objects', () => {
    const refError = new ReferenceError('Variable is not defined')
    const context = { feature: 'editor', action: 'render' }

    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    expect(() => safeLogError(refError, context)).not.toThrow()
    expect(monitoring.logError).toHaveBeenCalledWith(refError, context)
  })

  it('should be idempotent when called multiple times', () => {
    const testError = new Error('Repeated error')
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    safeLogError(testError)
    safeLogError(testError)
    safeLogError(testError)

    expect(monitoring.logError).toHaveBeenCalledTimes(3)
  })

  it('should handle console.error itself throwing (extreme edge case)', () => {
    const testError = new Error('Test error')
    const monitoringError = new Error('Monitoring failed')

    vi.spyOn(monitoring, 'logError').mockImplementation(() => {
      throw monitoringError
    })

    // Make console.error throw on first call, succeed on second
    let callCount = 0
    consoleErrorSpy.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        throw new Error('Console error failed')
      }
    })

    // Should not throw even if console.error throws
    expect(() => safeLogError(testError)).not.toThrow()
  })
})

describe('Monitoring Class', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logError', () => {
    it('should log error to console when not initialized', () => {
      const testError = new Error('Test error')
      const context: ErrorContext = { feature: 'test', action: 'test_action' }

      monitoring.logError(testError, context)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Untracked error:',
        testError,
        context
      )
    })

    it('should handle errors without context', () => {
      const testError = new Error('Error without context')

      monitoring.logError(testError)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Untracked error:',
        testError,
        undefined
      )
    })

    it('should call Sentry.captureException when initialized', () => {
      const captureExceptionSpy = vi.spyOn(Sentry, 'captureException')
      const withScopeSpy = vi.spyOn(Sentry, 'withScope')
      const trackSpy = vi.spyOn(analytics, 'track')

      // Mock monitoring as initialized
      const originalInit = monitoring.init
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const testError = new Error('Test error')
      const context: ErrorContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        feature: 'notes',
        action: 'save',
        additionalData: { noteId: 'note-456' },
      }

      monitoring.logError(testError, context)

      expect(withScopeSpy).toHaveBeenCalled()
      expect(captureExceptionSpy).toHaveBeenCalledWith(testError)
      expect(trackSpy).toHaveBeenCalledWith('error_occurred', {
        error_type: testError.name,
        error_message: testError.message,
        feature: context.feature,
        action: context.action,
      })
    })

    it('should handle Sentry.captureException throwing', () => {
      vi.spyOn(Sentry, 'withScope').mockImplementation(() => {
        throw new Error('Sentry failed')
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const testError = new Error('Test error')

      expect(() => monitoring.logError(testError)).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Monitoring: Failed to log error',
        expect.any(Error)
      )
    })

    it('should set user context in Sentry scope', () => {
      const setUserSpy = vi.fn()
      vi.spyOn(Sentry, 'withScope').mockImplementation(callback => {
        callback({
          setUser: setUserSpy,
          setTag: vi.fn(),
          setContext: vi.fn(),
        } as any)
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)
      vi.spyOn(Sentry, 'captureException')
      vi.spyOn(analytics, 'track')

      const testError = new Error('Test')
      const context: ErrorContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
      }

      monitoring.logError(testError, context)

      expect(setUserSpy).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
      })
    })

    it('should set feature and action tags', () => {
      const setTagSpy = vi.fn()
      vi.spyOn(Sentry, 'withScope').mockImplementation(callback => {
        callback({
          setUser: vi.fn(),
          setTag: setTagSpy,
          setContext: vi.fn(),
        } as any)
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)
      vi.spyOn(Sentry, 'captureException')
      vi.spyOn(analytics, 'track')

      const testError = new Error('Test')
      const context: ErrorContext = {
        feature: 'editor',
        action: 'autosave',
      }

      monitoring.logError(testError, context)

      expect(setTagSpy).toHaveBeenCalledWith('feature', 'editor')
      expect(setTagSpy).toHaveBeenCalledWith('action', 'autosave')
    })

    it('should set additional data context', () => {
      const setContextSpy = vi.fn()
      vi.spyOn(Sentry, 'withScope').mockImplementation(callback => {
        callback({
          setUser: vi.fn(),
          setTag: vi.fn(),
          setContext: setContextSpy,
        } as any)
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)
      vi.spyOn(Sentry, 'captureException')
      vi.spyOn(analytics, 'track')

      const testError = new Error('Test')
      const context: ErrorContext = {
        additionalData: {
          noteId: 'note-123',
          timestamp: 123456789,
        },
      }

      monitoring.logError(testError, context)

      expect(setContextSpy).toHaveBeenCalledWith('additional_data', {
        noteId: 'note-123',
        timestamp: 123456789,
      })
    })
  })

  describe('logWarning', () => {
    it('should log warning to console when not initialized', () => {
      const message = 'Test warning'
      const context: ErrorContext = { feature: 'test' }

      monitoring.logWarning(message, context)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Untracked warning:',
        message,
        context
      )
    })

    it('should call Sentry.captureMessage when initialized', () => {
      const captureMessageSpy = vi.spyOn(Sentry, 'captureMessage')
      vi.spyOn(Sentry, 'withScope').mockImplementation(callback => {
        callback({
          setUser: vi.fn(),
          setTag: vi.fn(),
          setContext: vi.fn(),
        } as any)
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const message = 'Warning message'
      const context: ErrorContext = { feature: 'test' }

      monitoring.logWarning(message, context)

      expect(captureMessageSpy).toHaveBeenCalledWith(message, 'warning')
    })

    it('should handle Sentry.captureMessage throwing', () => {
      vi.spyOn(Sentry, 'withScope').mockImplementation(() => {
        throw new Error('Sentry failed')
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      expect(() => monitoring.logWarning('Test warning')).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Monitoring: Failed to log warning',
        expect.any(Error)
      )
    })

    it('should work without context', () => {
      const message = 'Simple warning'

      monitoring.logWarning(message)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Untracked warning:',
        message,
        undefined
      )
    })
  })

  describe('setUser', () => {
    it('should not call Sentry when not initialized', () => {
      const setUserSpy = vi.spyOn(Sentry, 'setUser')

      monitoring.setUser('user-123', 'test@example.com')

      expect(setUserSpy).not.toHaveBeenCalled()
    })

    it('should call Sentry.setUser when initialized', () => {
      const setUserSpy = vi.spyOn(Sentry, 'setUser')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      monitoring.setUser('user-123', 'test@example.com', { plan: 'premium' })

      expect(setUserSpy).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        plan: 'premium',
      })
    })

    it('should handle Sentry.setUser throwing', () => {
      vi.spyOn(Sentry, 'setUser').mockImplementation(() => {
        throw new Error('Sentry failed')
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      expect(() => monitoring.setUser('user-123')).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Monitoring: Failed to set user context',
        expect.any(Error)
      )
    })

    it('should work with just userId', () => {
      const setUserSpy = vi.spyOn(Sentry, 'setUser')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      monitoring.setUser('user-123')

      expect(setUserSpy).toHaveBeenCalledWith({
        id: 'user-123',
        email: undefined,
      })
    })
  })

  describe('addBreadcrumb', () => {
    it('should not call Sentry when not initialized', () => {
      const addBreadcrumbSpy = vi.spyOn(Sentry, 'addBreadcrumb')

      monitoring.addBreadcrumb('Test breadcrumb')

      expect(addBreadcrumbSpy).not.toHaveBeenCalled()
    })

    it('should call Sentry.addBreadcrumb when initialized', () => {
      const addBreadcrumbSpy = vi.spyOn(Sentry, 'addBreadcrumb')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const message = 'User action'
      const category = 'navigation'
      const data = { page: '/editor' }

      monitoring.addBreadcrumb(message, category, data)

      expect(addBreadcrumbSpy).toHaveBeenCalledWith({
        message,
        category,
        data,
        timestamp: expect.any(Number),
      })
    })

    it('should use default category when not provided', () => {
      const addBreadcrumbSpy = vi.spyOn(Sentry, 'addBreadcrumb')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      monitoring.addBreadcrumb('Test message')

      expect(addBreadcrumbSpy).toHaveBeenCalledWith({
        message: 'Test message',
        category: 'custom',
        data: undefined,
        timestamp: expect.any(Number),
      })
    })

    it('should handle Sentry.addBreadcrumb throwing', () => {
      vi.spyOn(Sentry, 'addBreadcrumb').mockImplementation(() => {
        throw new Error('Sentry failed')
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      expect(() => monitoring.addBreadcrumb('Test')).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Monitoring: Failed to add breadcrumb',
        expect.any(Error)
      )
    })
  })

  describe('trackPerformance', () => {
    it('should not call Sentry when not initialized', () => {
      const setMeasurementSpy = vi.spyOn(Sentry, 'setMeasurement')
      const trackPerformanceSpy = vi.spyOn(analytics, 'trackPerformance')

      const metric: PerformanceMetric = {
        name: 'page_load',
        value: 1500,
      }

      monitoring.trackPerformance(metric)

      expect(setMeasurementSpy).not.toHaveBeenCalled()
      expect(trackPerformanceSpy).not.toHaveBeenCalled()
    })

    it('should call Sentry.setMeasurement and analytics.trackPerformance when initialized', () => {
      const setMeasurementSpy = vi.spyOn(Sentry, 'setMeasurement')
      const trackPerformanceSpy = vi.spyOn(analytics, 'trackPerformance')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const metric: PerformanceMetric = {
        name: 'api_response_time',
        value: 250,
        unit: 'millisecond',
        tags: { endpoint: '/api/notes' },
      }

      monitoring.trackPerformance(metric)

      expect(setMeasurementSpy).toHaveBeenCalledWith(
        'api_response_time',
        250,
        'millisecond'
      )
      expect(trackPerformanceSpy).toHaveBeenCalledWith('api_response_time', 250, {
        unit: 'millisecond',
        endpoint: '/api/notes',
      })
    })

    it('should use default unit when not provided', () => {
      const setMeasurementSpy = vi.spyOn(Sentry, 'setMeasurement')
      vi.spyOn(analytics, 'trackPerformance')
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const metric: PerformanceMetric = {
        name: 'operation_time',
        value: 100,
      }

      monitoring.trackPerformance(metric)

      expect(setMeasurementSpy).toHaveBeenCalledWith(
        'operation_time',
        100,
        'millisecond'
      )
    })

    it('should handle Sentry.setMeasurement throwing', () => {
      vi.spyOn(Sentry, 'setMeasurement').mockImplementation(() => {
        throw new Error('Sentry failed')
      })
      vi.spyOn(monitoring as any, 'isInitialized', 'get').mockReturnValue(true)

      const metric: PerformanceMetric = { name: 'test', value: 100 }

      expect(() => monitoring.trackPerformance(metric)).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Monitoring: Failed to track performance',
        expect.any(Error)
      )
    })
  })
})

describe('Convenience Export Functions', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logError convenience function', () => {
    it('should call monitoring.logError', () => {
      const logErrorSpy = vi.spyOn(monitoring, 'logError')
      const testError = new Error('Test')
      const context: ErrorContext = { feature: 'test' }

      logError(testError, context)

      expect(logErrorSpy).toHaveBeenCalledWith(testError, context)
    })

    it('should work without context', () => {
      const logErrorSpy = vi.spyOn(monitoring, 'logError')
      const testError = new Error('Test')

      logError(testError)

      expect(logErrorSpy).toHaveBeenCalledWith(testError, undefined)
    })
  })

  describe('logWarning convenience function', () => {
    it('should call monitoring.logWarning', () => {
      const logWarningSpy = vi.spyOn(monitoring, 'logWarning')
      const message = 'Warning'
      const context: ErrorContext = { feature: 'test' }

      logWarning(message, context)

      expect(logWarningSpy).toHaveBeenCalledWith(message, context)
    })
  })

  describe('trackPerformance convenience function', () => {
    it('should call monitoring.trackPerformance', () => {
      const trackPerfSpy = vi.spyOn(monitoring, 'trackPerformance')
      const metric: PerformanceMetric = { name: 'test', value: 100 }

      trackPerformance(metric)

      expect(trackPerfSpy).toHaveBeenCalledWith(metric)
    })
  })

  describe('addBreadcrumb convenience function', () => {
    it('should call monitoring.addBreadcrumb', () => {
      const addBreadcrumbSpy = vi.spyOn(monitoring, 'addBreadcrumb')
      const message = 'Test'
      const category = 'navigation'
      const data = { page: '/test' }

      addBreadcrumb(message, category, data)

      expect(addBreadcrumbSpy).toHaveBeenCalledWith(message, category, data)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle null error gracefully', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    // Cast to Error to satisfy TypeScript, but test runtime behavior
    expect(() => safeLogError(null as any)).not.toThrow()
  })

  it('should handle undefined error gracefully', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    expect(() => safeLogError(undefined as any)).not.toThrow()
  })

  it('should handle error with circular references in context', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const testError = new Error('Test')
    const circularObj: any = { a: 1 }
    circularObj.self = circularObj

    const context: ErrorContext = {
      feature: 'test',
      additionalData: circularObj,
    }

    expect(() => safeLogError(testError, context)).not.toThrow()
  })

  it('should handle very long error messages', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const longMessage = 'A'.repeat(10000)
    const testError = new Error(longMessage)

    expect(() => safeLogError(testError)).not.toThrow()
    expect(testError.message).toHaveLength(10000)
  })

  it('should handle context with deeply nested objects', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const testError = new Error('Test')
    const deeplyNested: any = { level1: { level2: { level3: { level4: { level5: 'deep' } } } } }

    const context: ErrorContext = {
      feature: 'test',
      additionalData: deeplyNested,
    }

    expect(() => safeLogError(testError, context)).not.toThrow()
  })

  it('should handle concurrent calls to safeLogError', async () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {
      // Simulate async operation
      return new Promise(resolve => setTimeout(resolve, 10))
    })

    const errors = Array.from({ length: 10 }, (_, i) => new Error(`Error ${i}`))

    const promises = errors.map(error => {
      return new Promise<void>(resolve => {
        safeLogError(error)
        resolve()
      })
    })

    await expect(Promise.all(promises)).resolves.toBeDefined()
  })

  it('should handle Error subclasses correctly', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    class CustomError extends Error {
      code: string
      constructor(message: string, code: string) {
        super(message)
        this.name = 'CustomError'
        this.code = code
      }
    }

    const customError = new CustomError('Custom error occurred', 'ERR_CUSTOM')

    expect(() => safeLogError(customError)).not.toThrow()
    expect(monitoring.logError).toHaveBeenCalledWith(customError, undefined)
  })

  it('should handle DOMException errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const domError = new DOMException('Quota exceeded', 'QuotaExceededError')

    expect(() => safeLogError(domError as any)).not.toThrow()
  })

  it('should handle errors with stack traces', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const testError = new Error('Error with stack')
    expect(testError.stack).toBeDefined()

    expect(() => safeLogError(testError)).not.toThrow()
  })

  it('should handle errors without stack traces', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const testError = new Error('Error without stack')
    delete testError.stack

    expect(() => safeLogError(testError)).not.toThrow()
  })
})

describe('Real-world Scenarios', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle network timeout errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const networkError = new Error('Network request failed: timeout')
    networkError.name = 'NetworkError'

    const context: ErrorContext = {
      feature: 'sync',
      action: 'fetch_notes',
      additionalData: {
        url: 'https://api.example.com/notes',
        timeout: 30000,
      },
    }

    safeLogError(networkError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(networkError, context)
  })

  it('should handle database errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const dbError = new Error('Transaction failed: database locked')
    dbError.name = 'DatabaseError'

    const context: ErrorContext = {
      feature: 'storage',
      action: 'save_note',
      additionalData: {
        noteId: 'note-123',
        operation: 'insert',
      },
    }

    safeLogError(dbError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(dbError, context)
  })

  it('should handle validation errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const validationError = new Error('Validation failed: title is required')
    validationError.name = 'ValidationError'

    const context: ErrorContext = {
      feature: 'editor',
      action: 'create_note',
      additionalData: {
        formData: { title: '', content: 'test' },
      },
    }

    safeLogError(validationError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(validationError, context)
  })

  it('should handle authentication errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const authError = new Error('Authentication failed: invalid token')
    authError.name = 'AuthenticationError'

    const context: ErrorContext = {
      feature: 'auth',
      action: 'verify_token',
      userId: 'user-123',
    }

    safeLogError(authError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(authError, context)
  })

  it('should handle parsing errors', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const parseError = new SyntaxError('Unexpected token in JSON')

    const context: ErrorContext = {
      feature: 'sync',
      action: 'parse_response',
      additionalData: {
        responseText: '{"invalid": json',
      },
    }

    safeLogError(parseError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(parseError, context)
  })

  it('should handle async operation failures', async () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const asyncError = new Error('Async operation failed')

    try {
      await Promise.reject(asyncError)
    } catch (error) {
      safeLogError(error as Error, {
        feature: 'async_operation',
        action: 'process_data',
      })
    }

    expect(monitoring.logError).toHaveBeenCalled()
  })

  it('should handle errors in event handlers', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const eventError = new Error('Event handler failed')

    const context: ErrorContext = {
      feature: 'ui',
      action: 'button_click',
      additionalData: {
        elementId: 'save-button',
        eventType: 'click',
      },
    }

    safeLogError(eventError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(eventError, context)
  })

  it('should handle errors during initialization', () => {
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})

    const initError = new Error('Failed to initialize feature')

    const context: ErrorContext = {
      feature: 'app_startup',
      action: 'initialize_modules',
      additionalData: {
        module: 'analytics',
        timestamp: Date.now(),
      },
    }

    safeLogError(initError, context)

    expect(monitoring.logError).toHaveBeenCalledWith(initError, context)
  })
})
