import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useKeyboardShortcut } from '../useKeyboardShortcut'

describe('useKeyboardShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call callback when keyboard shortcut is pressed', () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut('s', callback, { ctrl: true }))

    // Simulate Ctrl+S
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle Cmd key on Mac (metaKey)', () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut('n', callback, { ctrl: true }))

    // Simulate Cmd+N (Mac)
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      metaKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not call callback when shortcut is disabled', () => {
    const callback = vi.fn()
    renderHook(() =>
      useKeyboardShortcut('s', callback, { ctrl: true, enabled: false })
    )

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should require shift modifier when specified', () => {
    const callback = vi.fn()
    renderHook(() =>
      useKeyboardShortcut('s', callback, { ctrl: true, shift: true })
    )

    // Without shift - should not trigger
    const eventWithoutShift = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: false,
    })
    window.dispatchEvent(eventWithoutShift)
    expect(callback).not.toHaveBeenCalled()

    // With shift - should trigger
    const eventWithShift = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(eventWithShift)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should be case insensitive for key matching', () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut('S', callback, { ctrl: true }))

    // Press lowercase 's'
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cleanup event listener on unmount', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcut('s', callback, { ctrl: true })
    )

    unmount()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })
})
