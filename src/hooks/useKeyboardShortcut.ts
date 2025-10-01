import { useEffect } from 'react'

/**
 * Custom hook for registering keyboard shortcuts
 * Handles both Ctrl (Windows/Linux) and Cmd (Mac) modifiers
 *
 * @param key - The key to listen for (e.g., 's', 'n', 'f')
 * @param callback - Function to call when shortcut is pressed
 * @param options - Additional options for the shortcut
 */
export const useKeyboardShortcut = (
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    enabled?: boolean
  } = {}
) => {
  const { ctrl = true, shift = false, alt = false, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase()

      // Check modifiers (Ctrl on Windows/Linux, Cmd on Mac)
      const modifierMatches =
        (ctrl ? event.ctrlKey || event.metaKey : true) &&
        (shift ? event.shiftKey : !event.shiftKey) &&
        (alt ? event.altKey : !event.altKey)

      // Ignore if user is typing in an input (unless it's a search input and we want Cmd+F)
      const target = event.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (keyMatches && modifierMatches) {
        // Allow Cmd+S and Cmd+N even when typing in editor
        if (key === 's' || key === 'n' || !isTyping) {
          event.preventDefault()
          callback(event)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [key, callback, ctrl, shift, alt, enabled])
}
