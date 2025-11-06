/**
 * Custom hook for auto-saving data with debouncing
 *
 * Automatically saves data after a period of inactivity,
 * providing visual feedback and error handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { monitoring } from '../utils/monitoring'

/**
 * Performs a shallow comparison of two objects
 * Handles edge cases that JSON.stringify cannot handle properly:
 * - Property order independence
 * - undefined values
 * - Date objects
 * - Arrays (shallow comparison)
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns true if objects are shallowly equal
 */
function shallowEqual<T>(obj1: T | null, obj2: T | null): boolean {
  // Handle null/undefined cases
  if (obj1 === obj2) return true
  if (!obj1 || !obj2) return false

  // Get all keys from both objects
  const keys1 = Object.keys(obj1 as object)
  const keys2 = Object.keys(obj2 as object)

  // Check if number of keys is different
  if (keys1.length !== keys2.length) return false

  // Check each key-value pair
  for (const key of keys1) {
    // Check if key exists on obj2 before accessing
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false

    const val1 = (obj1 as Record<string, unknown>)[key]
    const val2 = (obj2 as Record<string, unknown>)[key]

    // Handle Date objects by comparing their timestamps
    if (val1 instanceof Date && val2 instanceof Date) {
      if (val1.getTime() !== val2.getTime()) return false
      continue
    }

    // Handle arrays with shallow comparison
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false
      if (!val1.every((item, index) => item === val2[index])) return false
      continue
    }

    // Direct comparison for primitives and references
    if (val1 !== val2) return false
  }

  return true
}

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

    // Check if data actually changed using shallow equality
    const dataChanged = !shallowEqual(data, previousDataRef.current)

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
