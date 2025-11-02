import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retryAsync, isRetryableError, retryOnTransientError } from '../retry'

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('retryAsync', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const promise = retryAsync(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success')

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        initialDelay: 100,
      })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should exhaust retries and throw last error', async () => {
      const error = new Error('Persistent failure')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryAsync(operation, { maxAttempts: 3 })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow('Persistent failure')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should respect maxAttempts option', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'))

      const promise = retryAsync(operation, { maxAttempts: 5 })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(5)
    })

    it('should use exponential backoff', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'))
      const onRetry = vi.fn()

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry,
      })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()

      // Check retry delays (with jitter, they should be roughly exponential)
      expect(onRetry).toHaveBeenCalledTimes(2)
      const firstDelay = onRetry.mock.calls[0][2]
      const secondDelay = onRetry.mock.calls[1][2]

      // First delay should be around 100ms (±25% jitter)
      expect(firstDelay).toBeGreaterThan(75)
      expect(firstDelay).toBeLessThan(125)

      // Second delay should be around 200ms (±25% jitter)
      expect(secondDelay).toBeGreaterThan(150)
      expect(secondDelay).toBeLessThan(250)
    })

    it('should respect maxDelay option', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'))
      const onRetry = vi.fn()

      const promise = retryAsync(operation, {
        maxAttempts: 5,
        initialDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 2000,
        onRetry,
      })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()

      // All delays should be capped at maxDelay
      onRetry.mock.calls.forEach(call => {
        const delay = call[2]
        expect(delay).toBeLessThanOrEqual(2000 * 1.25) // Allow for jitter
      })
    })

    it('should respect shouldRetry callback', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Not retryable'))
        .mockResolvedValue('success')

      const shouldRetry = vi.fn((error: unknown, attempt: number) => {
        if (error instanceof Error) {
          return error.message === 'Retryable'
        }
        return false
      })

      const promise = retryAsync(operation, { shouldRetry, maxAttempts: 5 })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow('Not retryable')
      expect(operation).toHaveBeenCalledTimes(2)
      expect(shouldRetry).toHaveBeenCalledTimes(2)
    })

    it('should call onRetry callback before each retry', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()

      const promise = retryAsync(operation, { maxAttempts: 5, onRetry })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledTimes(2)

      // First retry
      expect(onRetry.mock.calls[0][0]).toEqual(new Error('First failure'))
      expect(onRetry.mock.calls[0][1]).toBe(1)

      // Second retry
      expect(onRetry.mock.calls[1][0]).toEqual(new Error('Second failure'))
      expect(onRetry.mock.calls[1][1]).toBe(2)
    })

    it('should handle non-Error exceptions', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValue('success')

      const promise = retryAsync(operation, { maxAttempts: 3 })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('Network request failed'))).toBe(true)
      expect(isRetryableError(new Error('Connection timeout'))).toBe(true)
      expect(isRetryableError(new Error('Fetch failed'))).toBe(true)
    })

    it('should identify transaction errors as retryable', () => {
      expect(isRetryableError(new Error('Transaction failed'))).toBe(true)
      expect(isRetryableError(new Error('Database locked'))).toBe(true)

      const transactionError = new Error('Transaction inactive')
      transactionError.name = 'TransactionInactiveError'
      expect(isRetryableError(transactionError)).toBe(true)
    })

    it('should identify validation errors as non-retryable', () => {
      expect(isRetryableError(new Error('Validation failed'))).toBe(false)
      expect(isRetryableError(new Error('Resource not found'))).toBe(false)
      expect(isRetryableError(new Error('Quota exceeded'))).toBe(false)

      const quotaError = new Error('Storage quota exceeded')
      quotaError.name = 'QuotaExceededError'
      expect(isRetryableError(quotaError)).toBe(false)
    })

    it('should treat unknown errors as non-retryable', () => {
      expect(isRetryableError(new Error('Unknown error'))).toBe(false)
      expect(isRetryableError('string error')).toBe(false)
      expect(isRetryableError({ error: 'object error' })).toBe(false)
      expect(isRetryableError(null)).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isRetryableError(new Error('NETWORK ERROR'))).toBe(true)
      expect(isRetryableError(new Error('Network Error'))).toBe(true)
      expect(isRetryableError(new Error('VALIDATION ERROR'))).toBe(false)
    })
  })

  describe('retryOnTransientError', () => {
    it('should retry on network errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success')

      const promise = retryOnTransientError(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on validation errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Validation failed'))

      const promise = retryOnTransientError(operation, { maxAttempts: 5 })
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow('Validation failed')
      expect(operation).toHaveBeenCalledTimes(1) // No retries
    })

    it('should retry on transaction errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Database transaction failed'))
        .mockResolvedValue('success')

      const promise = retryOnTransientError(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should accept custom retry options', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()

      const promise = retryOnTransientError(operation, {
        maxAttempts: 5,
        initialDelay: 200,
        onRetry,
      })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalled()
    })
  })
})
