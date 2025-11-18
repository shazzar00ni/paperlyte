/**
 * Custom hook for managing focus mode functionality
 *
 * Handles focus mode state, escape key, and click-outside detection
 * for distraction-free editing experiences.
 */

import { RefObject, useEffect, useRef, useState } from 'react'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

export interface UseFocusModeOptions {
  /** Whether to handle Escape key to exit focus mode */
  enableEscapeKey?: boolean
  /** Whether to handle click outside to exit focus mode */
  enableClickOutside?: boolean
  /** Callback when entering focus mode */
  onEnter?: () => void
  /** Callback when exiting focus mode */
  onExit?: () => void
}

export interface UseFocusModeReturn {
  /** Whether focus mode is currently active */
  isFocusMode: boolean
  /** Enter focus mode */
  enterFocusMode: () => void
  /** Exit focus mode */
  exitFocusMode: () => void
  /** Toggle focus mode on/off */
  toggleFocusMode: () => void
  /** Ref to attach to the focus mode container */
  focusModeRef: RefObject<HTMLDivElement>
}

/**
 * Hook for managing focus mode with keyboard and mouse interactions
 *
 * @example
 * ```tsx
 * const { isFocusMode, enterFocusMode, exitFocusMode, focusModeRef } = useFocusMode({
 *   enableEscapeKey: true,
 *   enableClickOutside: true,
 * })
 *
 * return (
 *   <div ref={focusModeRef}>
 *     {isFocusMode && <FocusModeContent />}
 *   </div>
 * )
 * ```
 */
export function useFocusMode(
  options: UseFocusModeOptions = {}
): UseFocusModeReturn {
  const {
    enableEscapeKey = true,
    enableClickOutside = true,
    onEnter,
    onExit,
  } = options

  const [isFocusMode, setIsFocusMode] = useState(false)
  const focusModeRef = useRef<HTMLDivElement>(null)
  const onEnterRef = useRef(onEnter)
  const onExitRef = useRef(onExit)

  // Update callback refs
  useEffect(() => {
    onEnterRef.current = onEnter
    onExitRef.current = onExit
  }, [onEnter, onExit])

  /**
   * Enter focus mode
   */
  const enterFocusMode = () => {
    setIsFocusMode(true)
    trackFeatureUsage('focus_mode', 'enter')
    monitoring.addBreadcrumb('Entered focus mode', 'user_action')
    onEnterRef.current?.()
  }

  /**
   * Exit focus mode
   */
  const exitFocusMode = () => {
    setIsFocusMode(false)
    trackFeatureUsage('focus_mode', 'exit')
    monitoring.addBreadcrumb('Exited focus mode', 'user_action')
    onExitRef.current?.()
  }

  /**
   * Toggle focus mode
   */
  const toggleFocusMode = () => {
    if (isFocusMode) {
      exitFocusMode()
    } else {
      enterFocusMode()
    }
  }

  // Handle Escape key
  useEffect(() => {
    if (!isFocusMode || !enableEscapeKey) return

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        exitFocusMode()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isFocusMode, enableEscapeKey])

  // Handle click outside
  useEffect(() => {
    if (!isFocusMode || !enableClickOutside) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        focusModeRef.current &&
        !focusModeRef.current.contains(e.target as Node)
      ) {
        exitFocusMode()
      }
    }

    // Add a small delay before attaching the listener
    // to prevent immediate exit when entering focus mode
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFocusMode, enableClickOutside])

  // Prevent body scroll when in focus mode
  useEffect(() => {
    if (isFocusMode) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isFocusMode])

  return {
    isFocusMode,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
    focusModeRef,
  }
}
