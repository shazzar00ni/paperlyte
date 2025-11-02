import { monitoring } from '@/utils/monitoring'
import { useCallback, useState } from 'react'

/**
 * Async operation state
 * Represents the current state of an async operation
 */
export interface AsyncOperationState<T = unknown> {
  /** Whether the operation is currently in progress */
  isLoading: boolean
  /** Error from the last operation, if any */
  error: Error | null
  /** Data from the last successful operation */
  data: T | null
  /** Whether the operation has succeeded at least once */
  isSuccess: boolean
  /** Whether the operation has failed */
  isError: boolean
}

/**
 * Options for async operation execution
 */
export interface AsyncOperationOptions<T = unknown> {
  /** Optional callback to run on success */
  onSuccess?: (data: T) => void
  /** Optional callback to run on error */
  onError?: (error: Error) => void
  /** Optional callback to run after operation (success or error) */
  onSettled?: () => void
  /** Feature name for monitoring breadcrumbs */
  feature?: string
  /** Action name for monitoring breadcrumbs */
  action?: string
  /** Whether to suppress error logging (default: false) */
  suppressErrorLogging?: boolean
}

/**
 * Return type for useAsyncOperation hook
 */
export interface UseAsyncOperationReturn<T, TArgs extends unknown[]> {
  /** Current state of the async operation */
  state: AsyncOperationState<T>
  /** Execute the async operation */
  execute: (...args: TArgs) => Promise<T>
  /** Reset the operation state */
  reset: () => void
  /** Manually set the data (useful for optimistic updates) */
  setData: (data: T | null) => void
  /** Manually set the error */
  setError: (error: Error | null) => void
  /** Convenience getters */
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  data: T | null
}

/**
 * Custom hook for managing async operation state
 *
 * Provides consistent loading, error, and success state management
 * for async operations like API calls, database operations, etc.
 *
 * @example
 * ```typescript
 * const saveNote = useAsyncOperation(
 *   async (note: Note) => {
 *     return await dataService.saveNote(note)
 *   },
 *   {
 *     feature: 'note_editor',
 *     action: 'save_note',
 *     onSuccess: () => showToast('Note saved!'),
 *     onError: (error) => showToast(error.message, 'error')
 *   }
 * )
 *
 * // Use in component
 * const handleSave = async () => {
 *   await saveNote.execute(currentNote)
 * }
 *
 * if (saveNote.isLoading) return <Spinner />
 * if (saveNote.isError) return <ErrorMessage error={saveNote.error} />
 * ```
 *
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * @returns Object with state and control methods
 */
export function useAsyncOperation<T, TArgs extends unknown[] = []>(
  asyncFn: (...args: TArgs) => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T, TArgs> {
  const {
    onSuccess,
    onError,
    onSettled,
    feature,
    action,
    suppressErrorLogging = false,
  } = options

  const [state, setState] = useState<AsyncOperationState<T>>({
    isLoading: false,
    error: null,
    data: null,
    isSuccess: false,
    isError: false,
  })

  /**
   * Execute the async operation
   */
  const execute = useCallback(
    async (...args: TArgs): Promise<T> => {
      // Add monitoring breadcrumb
      if (feature && action) {
        monitoring.addBreadcrumb(`${feature}: ${action} started`, 'info')
      }

      // Set loading state
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isError: false,
      }))

      try {
        const result = await asyncFn(...args)

        // Success state
        setState({
          isLoading: false,
          error: null,
          data: result,
          isSuccess: true,
          isError: false,
        })

        // Call success callback
        if (onSuccess) {
          onSuccess(result)
        }

        // Add success breadcrumb
        if (feature && action) {
          monitoring.addBreadcrumb(`${feature}: ${action} succeeded`, 'info')
        }

        return result
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error))

        // Error state - preserve previous successful data (stale data on error)
        setState(prev => ({
          isLoading: false,
          error: errorObj,
          data: prev.data, // Keep last known good value
          isSuccess: false,
          isError: true,
        }))

        // Log error to monitoring
        if (!suppressErrorLogging) {
          monitoring.logError(errorObj, {
            feature,
            action,
            additionalData: {
              args: args.length > 0 ? args : undefined,
            },
          })
        }

        // Call error callback
        if (onError) {
          onError(errorObj)
        }

        throw errorObj
      } finally {
        // Call settled callback
        if (onSettled) {
          onSettled()
        }
      }
    },
    [
      asyncFn,
      onSuccess,
      onError,
      onSettled,
      feature,
      action,
      suppressErrorLogging,
    ]
  )

  /**
   * Reset operation state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
      isSuccess: false,
      isError: false,
    })
  }, [])

  /**
   * Manually set data (useful for optimistic updates)
   * Always marks operation as successful, even if data is null
   * Use reset() to clear success state if needed
   */
  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
      isSuccess: true,
      error: null,
      isError: false,
    }))
  }, [])

  /**
   * Manually set error
   */
  const setError = useCallback((error: Error | null) => {
    setState(prev => ({
      ...prev,
      error,
      isError: error !== null,
      isSuccess: false,
    }))
  }, [])

  return {
    state,
    execute,
    reset,
    setData,
    setError,
    // Convenience getters
    isLoading: state.isLoading,
    isError: state.isError,
    isSuccess: state.isSuccess,
    error: state.error,
    data: state.data,
  }
}

/**
 * Hook for managing multiple async operations
 * Useful when you have several operations in a component
 *
 * @example
 * ```typescript
 * const operations = useAsyncOperations({
 *   load: useAsyncOperation(loadNotes),
 *   save: useAsyncOperation(saveNote),
 *   delete: useAsyncOperation(deleteNote),
 * })
 *
 * // Check if any operation is loading
 * const isLoading = operations.isAnyLoading()
 *
 * // Get all errors
 * const errors = operations.getAllErrors()
 * ```
 */
export function useAsyncOperations<
  T extends Record<string, UseAsyncOperationReturn<unknown, unknown[]>>,
>(operations: T) {
  return {
    ...operations,
    /**
     * Check if any operation is loading
     */
    isAnyLoading: () => Object.values(operations).some(op => op.isLoading),
    /**
     * Check if all operations are loading
     */
    isAllLoading: () => Object.values(operations).every(op => op.isLoading),
    /**
     * Get all errors from operations
     */
    getAllErrors: () =>
      Object.entries(operations)
        .filter(([, op]) => op.isError)
        .map(([key, op]) => ({ key, error: op.error })),
    /**
     * Reset all operations
     */
    resetAll: () => Object.values(operations).forEach(op => op.reset()),
  }
}
