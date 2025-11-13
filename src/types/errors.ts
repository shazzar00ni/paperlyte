/**
 * Custom error types for Paperlyte application
 *
 * These error types provide better context for error handling
 * and enable specific recovery strategies based on error type.
 */

/**
 * Base error class for all Paperlyte errors
 * @param message - Human-readable error message
 * @param code - Machine-readable error code
 * @param recoverable - Whether the error can be recovered from
 * @param context - Additional context for debugging
 */
export class PaperlyteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PaperlyteError'
    Object.setPrototypeOf(this, PaperlyteError.prototype)
  }
}

/**
 * Storage quota exceeded error
 */
export class StorageQuotaError extends PaperlyteError {
  constructor(
    message: string = 'Storage quota exceeded',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_QUOTA_EXCEEDED', true, context)
    this.name = 'StorageQuotaError'
    Object.setPrototypeOf(this, StorageQuotaError.prototype)
  }
}

/**
 * Storage unavailable error (e.g., IndexedDB not supported)
 */
export class StorageUnavailableError extends PaperlyteError {
  constructor(
    message: string = 'Storage is unavailable',
    context?: Record<string, unknown>
  ) {
    super(message, 'STORAGE_UNAVAILABLE', true, context)
    this.name = 'StorageUnavailableError'
    Object.setPrototypeOf(this, StorageUnavailableError.prototype)
  }
}

/**
 * Data validation error
 */
export class ValidationError extends PaperlyteError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', true, { ...context, field })
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Data not found error
 */
export class NotFoundError extends PaperlyteError {
  constructor(
    message: string,
    public readonly resourceId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'NOT_FOUND', false, { ...context, resourceId })
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Sync conflict error
 */
export class SyncConflictError extends PaperlyteError {
  constructor(
    message: string,
    public readonly noteId: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'SYNC_CONFLICT', true, { ...context, noteId })
    this.name = 'SyncConflictError'
    Object.setPrototypeOf(this, SyncConflictError.prototype)
  }
}

/**
 * Network error (for future API integration)
 */
export class NetworkError extends PaperlyteError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', retryable, { ...context, statusCode })
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Type guard to check if error is a PaperlyteError
 */
export function isPaperlyteError(error: unknown): error is PaperlyteError {
  return error instanceof PaperlyteError
}

/**
 * Type guard for StorageQuotaError
 */
export function isStorageQuotaError(
  error: unknown
): error is StorageQuotaError {
  return error instanceof StorageQuotaError
}

/**
 * Type guard for ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Type guard for NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

/**
 * Extract error message safely from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Extract error code if it's a PaperlyteError
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isPaperlyteError(error)) {
    return error.code
  }
  return undefined
}
