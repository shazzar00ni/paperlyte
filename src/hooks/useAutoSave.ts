/**
 * Custom hook for auto-saving data with debouncing
 *
 * Automatically saves data after a period of inactivity,
 * providing visual feedback and error handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { monitoring } from '../utils/monitoring'

export interface UseAutoSaveOptions<T> {
  /** Function to save the data */
  onSave: (data: T) => Promise<boolean>
  /** Delay in milliseconds before auto-saving (default: 1000) */
  delay?: number
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Callback when save completes */
  onSaveComplete?: (success: boolean) => void
}

export interface UseAutoSaveReturn {
  /** Whether a save is currently in progress */
  isSaving: boolean
  /** Whether the last save was successful */
  saveSuccess: boolean | null
  /** Manually trigger a save */
  triggerSave: () => Promise<void>
  /** Reset the save state */
  resetSaveState: () => void
}

/**
 * Auto-save hook with debouncing and state management
 *
 * @example
 * ```tsx
 * const { isSaving, saveSuccess, triggerSave } = useAutoSave({
 *   data: currentNote,
 *   onSave: async (note) => await dataService.saveNote(note),
 *   delay: 1000,
 * })
 * ```
 */
export function useAutoSave<T>(
  data: T | null,
  options: UseAutoSaveOptions<T>
): UseAutoSaveReturn {
  const { onSave, delay = 1000, enabled = true, onSaveComplete } = options

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<T | null>(data)
  const onSaveRef = useRef(onSave)
  const onSaveCompleteRef = useRef(onSaveComplete)

  // Update refs when callbacks change
  useEffect(() => {
    onSaveRef.current = onSave
    onSaveCompleteRef.current = onSaveComplete
  }, [onSave, onSaveComplete])

  /**
   * Perform the save operation
   */
  const performSave = useCallback(
    async (dataToSave: T) => {
      if (isSaving) {
        monitoring.addBreadcrumb(
          'Save already in progress, skipping',
          'warning'
        )
        return
      }

      setIsSaving(true)
      setSaveSuccess(null)

      try {
        const success = await onSaveRef.current(dataToSave)
        setSaveSuccess(success)

        if (success) {
          monitoring.addBreadcrumb('Auto-save successful', 'info')
        } else {
          monitoring.addBreadcrumb('Auto-save failed', 'warning')
        }

        // Call completion callback
        onSaveCompleteRef.current?.(success)
      } catch (error) {
        setSaveSuccess(false)
        monitoring.logError(error as Error, {
          feature: 'auto_save',
          action: 'perform_save',
        })
        onSaveCompleteRef.current?.(false)
      } finally {
        setIsSaving(false)
      }
    },
    [isSaving]
  )

  /**
   * Manually trigger a save
   */
  const triggerSave = useCallback(async () => {
    if (!data) return

    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await performSave(data)
  }, [data, performSave])

  /**
   * Reset save state
   */
  const resetSaveState = useCallback(() => {
    setSaveSuccess(null)
  }, [])

  // Auto-save effect when data changes
  useEffect(() => {
    if (!enabled || !data) {
      return
    }

    // Check if data actually changed
    const dataChanged =
      JSON.stringify(data) !== JSON.stringify(previousDataRef.current)

    if (!dataChanged) {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      performSave(data)
      previousDataRef.current = data
    }, delay)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, enabled, delay, performSave])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess !== null) {
      const timeout = setTimeout(() => {
        setSaveSuccess(null)
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [saveSuccess])

  return {
    isSaving,
    saveSuccess,
    triggerSave,
    resetSaveState,
  }
}
