/**
 * Retry utility for handling transient failures
 *
 * Provides exponential backoff and configurable retry strategies
 * for operations that may fail temporarily.
 */

import { monitoring } from './monitoring'

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts?: number

  /**
   * Initial delay in milliseconds before first retry
   */
  initialDelay?: number

  /**
   * Multiplier for exponential backoff
   */
  backoffMultiplier?: number

  /**
   * Maximum delay in milliseconds
   */
  maxDelay?: number

  /**
   * Function to determine if error is retryable
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean

  /**
   * Callback before each retry attempt
   */
  onRetry?: (error: unknown, attempt: number, delay: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 100,
  backoffMultiplier: 2,
  maxDelay: 5000,
  shouldRetry: () => true,
  onRetry: () => {},
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const exponentialDelay =
    initialDelay * Math.pow(backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, maxDelay)

  // Add jitter (±25% randomness) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)

  return Math.floor(cappedDelay + jitter)
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const data = await retryAsync(
 *   () => dataService.saveNote(note),
 *   { maxAttempts: 3, initialDelay: 200 }
 * )
 * ```
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const isLastAttempt = attempt === config.maxAttempts
      const shouldRetry = config.shouldRetry(error, attempt)

      if (isLastAttempt || !shouldRetry) {
        monitoring.addBreadcrumb('Retry exhausted or not retryable', 'error', {
          attempt,
          maxAttempts: config.maxAttempts,
          shouldRetry,
        })
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.backoffMultiplier,
        config.maxDelay
      )

      monitoring.addBreadcrumb('Retrying operation', 'info', {
        attempt,
        delay,
        error: error instanceof Error ? error.message : String(error),
      })

      config.onRetry(error, attempt, delay)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError
}

/**
 * Check if an error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Network-related errors (for future API)
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch')
    ) {
      return true
    }

    // Transient storage errors
    if (
      message.includes('transaction') ||
      message.includes('database locked') ||
      name.includes('transactioninactiveerror')
    ) {
      return true
    }

    // NOT retryable errors
    if (
      message.includes('quota') ||
      message.includes('validation') ||
      message.includes('not found') ||
      name.includes('quotaexceedederror')
    ) {
      return false
    }
  }

  // Default to not retrying unknown errors
  return false
}

/**
 * Wrapper for retry with default retryable error checking
 */
export async function retryOnTransientError<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry'> = {}
): Promise<T> {
  return retryAsync(operation, {
    ...options,
    shouldRetry: error => isRetryableError(error),
  })
}
