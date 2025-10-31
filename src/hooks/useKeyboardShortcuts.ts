/**
 * Custom hook for managing keyboard shortcuts
 *
 * Provides a declarative way to register and handle keyboard shortcuts
 * across the application with proper cleanup.
 */

import { useCallback, useEffect, useRef } from 'react'

export type KeyboardShortcut = {
  /** Key combination (e.g., 'ctrl+s', 'cmd+k', 'escape') */
  key: string
  /** Handler function */
  handler: () => void
  /** Optional description for documentation */
  description?: string
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean
}

/**
 * Parse a key combination string into normalized parts
 */
function parseShortcut(shortcut: string): {
  key: string
  ctrl: boolean
  cmd: boolean
  shift: boolean
  alt: boolean
} {
  const parts = shortcut.toLowerCase().split('+')
  const modifiers = parts.slice(0, -1)
  const key = parts[parts.length - 1]

  return {
    key,
    ctrl: modifiers.includes('ctrl'),
    cmd: modifiers.includes('cmd') || modifiers.includes('meta'),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
  }
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ReturnType<typeof parseShortcut>
): boolean {
  const eventKey = event.key.toLowerCase()

  // Check if the key matches
  if (
    eventKey !== shortcut.key &&
    event.code.toLowerCase() !== shortcut.key.toLowerCase()
  ) {
    return false
  }

  // Check modifiers
  if (shortcut.ctrl && !event.ctrlKey) return false
  if (shortcut.cmd && !event.metaKey) return false
  if (shortcut.shift && !event.shiftKey) return false
  if (shortcut.alt && !event.altKey) return false

  // Check that no extra modifiers are pressed
  if (!shortcut.ctrl && event.ctrlKey && !shortcut.cmd) return false
  if (!shortcut.cmd && event.metaKey && !shortcut.ctrl) return false
  if (!shortcut.shift && event.shiftKey) return false
  if (!shortcut.alt && event.altKey) return false

  return true
}

/**
 * Register keyboard shortcuts with automatic cleanup
 *
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param enabled - Whether shortcuts are enabled (default: true)
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'ctrl+s', handler: saveNote, description: 'Save note' },
 *   { key: 'cmd+s', handler: saveNote, description: 'Save note (Mac)' },
 *   { key: 'ctrl+k', handler: focusSearch, description: 'Focus search' },
 * ])
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  // Use refs to avoid recreating the handler on every render
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts)
  const enabledRef = useRef(enabled)

  // Update refs when values change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    enabledRef.current = enabled
  }, [shortcuts, enabled])

  // Memoize the event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return

    for (const shortcut of shortcutsRef.current) {
      const parsed = parseShortcut(shortcut.key)

      if (matchesShortcut(event, parsed)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.handler()
        break // Only trigger one shortcut per key press
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Simpler hook for a single keyboard shortcut
 *
 * @example
 * ```tsx
 * useKeyboardShortcut('ctrl+s', saveNote)
 * ```
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  enabled: boolean = true
) {
  useKeyboardShortcuts([{ key, handler }], enabled)
}
