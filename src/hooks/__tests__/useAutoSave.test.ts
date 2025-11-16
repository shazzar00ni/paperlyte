import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave } from '../useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default state', () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useAutoSave({ content: 'test' }, { onSave })
    )

    expect(result.current.isSaving).toBe(false)
    expect(result.current.saveSuccess).toBe(null)
  })

  it('should auto-save after delay when data changes', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      {
        initialProps: { data: { content: 'initial' } },
      }
    )

    // Change data
    rerender({ data: { content: 'updated' } })

    // Should not save immediately
    expect(onSave).not.toHaveBeenCalled()

    // Fast-forward time
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ content: 'updated' })
    })

    expect(result.current.saveSuccess).toBe(true)
  })

  it('should debounce multiple rapid changes', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      {
        initialProps: { data: { content: 'initial' } },
      }
    )

    // Make multiple rapid changes
    rerender({ data: { content: 'change1' } })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    rerender({ data: { content: 'change2' } })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    rerender({ data: { content: 'change3' } })

    // Only the last change should be saved after delay
    expect(onSave).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({ content: 'change3' })
    })
  })

  it('should not save when data has not changed', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave, delay: 1000 }),
      {
        initialProps: { data: { content: 'test' } },
      }
    )

    // Re-render with same data
    rerender({ data: { content: 'test' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should not save when data is null', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderHook(() =>
      useAutoSave(null, { onSave, delay: 1000 })
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should not save when disabled', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result, rerender } = renderHook(
      ({ data, enabled }) =>
        useAutoSave(data, { onSave, delay: 1000, enabled }),
      {
        initialProps: { data: { content: 'initial' }, enabled: false },
      }
    )

    rerender({ data: { content: 'updated' }, enabled: false })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should manually trigger save', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useAutoSave({ content: 'test' }, { onSave, delay: 1000 })
    )

    await act(async () => {
      await result.current.triggerSave()
    })

    expect(onSave).toHaveBeenCalledWith({ content: 'test' })
    expect(result.current.saveSuccess).toBe(true)
  })

  it('should handle save errors', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'))
    const { result } = renderHook(() =>
      useAutoSave({ content: 'test' }, { onSave, delay: 1000 })
    )

    await act(async () => {
      await result.current.triggerSave()
    })

    expect(result.current.saveSuccess).toBe(false)
    expect(result.current.isSaving).toBe(false)
  })

  it('should reset save state', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useAutoSave({ content: 'test' }, { onSave, delay: 1000 })
    )

    await act(async () => {
      await result.current.triggerSave()
    })

    expect(result.current.saveSuccess).toBe(true)

    act(() => {
      result.current.resetSaveState()
    })

    expect(result.current.saveSuccess).toBe(null)
  })
})
